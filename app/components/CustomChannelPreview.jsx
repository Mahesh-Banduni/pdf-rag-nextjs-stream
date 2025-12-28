import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChannelPreviewMessenger } from "stream-chat-react";
import { Edit2, Trash2, Ellipsis, X } from "lucide-react";

const CustomChannelPreview = ({
  isMdDown,
  channel,
  setActiveChannel,
  activeChannel,
  setSidebarOpen,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChannelActionModal, setShowChannelActionModal] = useState(false);
  const [showRenameActionModal, setShowRenameActionModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState(channel?.data?.name || "");

  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const [menuPos, setMenuPos] = useState({
    top: 0,
    left: 0,
    openUp: false,
  });

  // PORTAL ROOT (create if not exists)
  const [portalRoot] = useState(() => {
    let el = document.getElementById("dropdown-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "dropdown-root";
      document.body.appendChild(el);
    }
    return el;
  });

  // Calculate dropdown position
  useEffect(() => {
    if (menuOpen && buttonRef.current) {
      const btn = buttonRef.current.getBoundingClientRect();
      const menuHeight = 120;
      const screenHeight = window.innerHeight;

      const openUp = btn.bottom + menuHeight > screenHeight;

      setMenuPos({
        top: openUp ? btn.top - 10 : btn.bottom + 6,
        left: btn.right - 120,
        openUp,
      });
    }
  }, [menuOpen]);

  // Close on outside click
  useEffect(() => {
    function close(e) {
      if (!menuRef.current || menuRef.current.contains(e.target)) return;
      if (buttonRef.current && buttonRef.current.contains(e.target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const renameChannel = async () => {
    if (!newChannelName.trim()) return;
    await channel.update({ name: newChannelName });
    setShowRenameActionModal(false);
    setMenuOpen(false);
  };

  const deleteChannel = async () => {
    const allVectorIds = channel.data.channel_detail.pdf_docs.flatMap(d => d.vector_ids || []);
    if(allVectorIds.length !== 0){
      try{
        const res = await fetch('/api/remove', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vectorIds: allVectorIds }),
        });
        if(!res.ok){
          console.error('Failed to delete vectors from Pinecone');
        }
      }
      catch(err){
        console.error('Error deleting vectors:', err);
      }
    }
    await channel.delete();
    setActiveChannel(null);
    setMenuOpen(false);
  };

  const DropdownPortal = menuOpen
    ? createPortal(
        <div
          ref={menuRef}
          className="absolute z-[99] bg-slate-900 text-white border border-slate-700 shadow-xl rounded-md overflow-hidden 
                     animate-dropdown origin-top-left"
          style={{
            top: menuPos.top,
            left: menuPos.left,
            position: "fixed",
            width: "max-content",
            minWidth: "130px",
          }}
        >
          <button
            onClick={() => {
              setNewChannelName(channel?.data?.name || "");
              setShowRenameActionModal(true);
            }}
            className="flex w-full px-3 py-2 text-left hover:bg-slate-700 gap-2"
          >
            <Edit2 className="w-4 h-4 mt-1" />
            Rename
          </button>

          <button
            onClick={() => setShowChannelActionModal(true)}
            className="flex w-full px-3 py-2 text-left hover:bg-slate-700 gap-2"
          >
            <Trash2 className="w-4 h-4 mt-1" />
            Delete
          </button>
        </div>,

        portalRoot
      )
    : null;

  return (
    <>
      <div
        className={`relative group flex items-center justify-between 
                 m-2 px-2 rounded-md cursor-pointer text-white transition-colors
                 ${activeChannel === channel ? "bg-slate-800" : "bg-slate-900"} 
                 hover:bg-slate-700`}
        onClick={() => {
          if (isMdDown) {
            setActiveChannel(channel);
            setSidebarOpen(false);
          } else {
            setActiveChannel(channel);
          }
        }}
      >
        <div className="flex-1">
          <ChannelPreviewMessenger
            channel={channel}
            displayTitle={channel.data.name}
          />
        </div>

        <button
          ref={buttonRef}
          className="p-2 hover:bg-slate-700 rounded-md cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setActiveChannel(channel);
            setMenuOpen(!menuOpen);
          }}
        >
          <Ellipsis size={18} />
        </button>
      </div>

      {/* RENDER MENU PORTAL */}
      {DropdownPortal}

      {/* Rename Modal */}
      {showRenameActionModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-500 flex items-center justify-center p-4"
          onClick={() => {
            setShowRenameActionModal(false);
            setMenuOpen(false);
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                Rename Channel
              </h3>
              <button
                onClick={() => setShowRenameActionModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <div className="space-y-4 w-full">
                <input
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Enter new channel name"
                  className="border border-gray-400 rounded-md w-full text-gray-900 p-2 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div className="flex flex-row justify-end gap-2 mt-5">
                <button
                  onClick={() => setShowRenameActionModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={renameChannel}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      renameChannel();
                    }
                    if (e.key === "Escape") {
                      setShowRenameActionModal(false);
                    }
                  }}
                  autoFocus
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-600 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Modal */}
      {showChannelActionModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-500 flex items-center justify-center p-4"
          onClick={() => {
            setShowChannelActionModal(false);
            setMenuOpen(false);
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                Delete Channel
              </h3>
              <button
                onClick={() => setShowChannelActionModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <p className="text-md text-slate-900 dark:text-slate-300">
                Are you sure you want to permanently delete this chat channel?
              </p>
              <div className="flex flex-row justify-end gap-2 mt-5">
                <button
                  onClick={() => setShowChannelActionModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteChannel}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomChannelPreview;


