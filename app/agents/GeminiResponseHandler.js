// lib/ai/GeminiResponseHandler.js
import { TextDecoder } from 'util';

export class GeminiResponseHandler {
  constructor({ messages, model, apiKey, baseUrl, channelObj, channelMessage, memory, botUserId, serverClient, user_id, onComplete }) {
    this.messages = messages || [];
    this.model = model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    this.apiKey = apiKey;
    this.baseUrl = (baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/$/, '');

    this.channel = this._normalizeChannel(channelObj);
    this.message = channelMessage;
    this.memory = memory;
    this.botUserId = botUserId;

    this.message_text = '';
    this.chunk_counter = 0;
    this.controller = new AbortController();
    this.serverClient=serverClient;
    this.user_id=user_id;
    this.onComplete = onComplete;
  }

  dispose() { try { this.controller.abort(); } catch (e) {} }

  _normalizeChannel(channel) {
    if (!channel) return null;

    return {
      partialUpdateMessage: typeof channel.partialUpdateMessage === 'function'
        ? channel.partialUpdateMessage.bind(channel)
        : null,

      updateMessage: typeof channel.updateMessage === 'function'
        ? (id, data) => channel.updateMessage({ id, ...data })
        : null,

      editMessage: typeof channel.updateMessage === 'function'
        ? (id, data) => channel.updateMessage({ id, ...data })
        : null,

      sendEvent: typeof channel.sendEvent === 'function'
        ? channel.sendEvent.bind(channel)
        : null,
    };
  }

  async _updateMessageSafe(data) {
    if (!this.channel) return;
    return await this.serverClient.partialUpdateMessage(this.message.id, {
      set: data,
      user_id: this.user_id
    });
  }

  async run() {
    if (!this.apiKey) {
      console.warn('No GEMINI_API_KEY; aborting');
      return;
    }

    const url = `${this.baseUrl}/v1/chat/completions`;
    const payload = {
      model: this.model,
      messages: this.messages,
      max_tokens: 1024,
      stream: true,
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.2')
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: this.controller.signal,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('Gemini stream error', res.status, txt);
      try {
        await this.channel?.sendEvent?.({
          type: 'ai_indicator.update',
          ai_state: 'AI_STATE_ERROR',
          message_id: this.message.id
        });
      } catch (e) {}
      return;
    }

    try {
      await this.channel?.sendEvent?.({
        type: 'ai_indicator.update',
        ai_state: 'AI_STATE_GENERATING',
        message_id: this.message.id
      });
    } catch (e) {}

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = '';

    while (!done) {
      const { value, done: rdone } = await reader.read();
      done = rdone;
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\r?\n/);
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.trim()) continue;
          const line = part.startsWith('data:') ? part.replace(/^data:\s*/, '') : part;
          if (line === '[DONE]') {
            await this._finalize();
            return;
          }
          try {
            const parsed = JSON.parse(line);
            const choices = parsed.choices || [];
            for (const ch of choices) {
              const delta = ch.delta || ch;
              const contentArr = delta?.message?.content || delta?.content || delta;
              let text = '';

              if (Array.isArray(contentArr)) {
                for (const block of contentArr) {
                  if (typeof block === 'string') text += block;
                  else if (block?.text) text += block.text;
                }
              } else if (typeof contentArr === 'string') {
                text = contentArr;
              } else if (contentArr && contentArr.type === 'output_text') {
                text = contentArr.text || '';
              }

              if (text) await this._handleTextDelta(text);
              if (ch.finish_reason) {
                await this._finalize();
                return;
              }
            }
          } catch (err) {
            await this._handleTextDelta(line);
          }
        }
      }
    }

    if (buffer && buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        const choices = parsed.choices || [];
        for (const ch of choices) {
          const delta = ch.delta || ch;
          const text = delta?.message?.content?.[0]?.text || delta?.content || '';
          if (text) await this._handleTextDelta(text);
        }
      } catch (e) {
        await this._handleTextDelta(buffer);
      }
    }

    await this._finalize();
  }

  async _handleTextDelta(text) {
    this.message_text += text;
    this.chunk_counter++;

    const shouldUpdate =
      this.chunk_counter % 8 === 0 ||
      (this.chunk_counter < 6 && this.chunk_counter % 2 !== 0);

    if (shouldUpdate) {
      await this._updateMessageSafe({ text: this.message_text, generating: true });
    }
  }

  async _finalize() {
    try {
      await new Promise(r => setTimeout(r, 150));

      try { this.memory?.addMessage?.({ role: 'assistant', content: this.message_text }); } catch (e) {}

      await this._updateMessageSafe({ text: this.message_text, generating: false });

      await this.channel?.sendEvent?.({
        type: 'ai_indicator.clear',
        message_id: this.message.id,
        user_id: this.botUserId || 'assistant'
      });

      // SIGNAL COMPLETION
      if (this.onComplete) {
        this.onComplete(this.message_text);
      }

    } catch (err) {
      console.warn('finalize error', err);
    }
  }
}
