// Desk and crew chat (feature #49). The same panel is used on both sides:
//   role="desk"  in the hospital dashboard
//   role="crew"  on the crew page (/crew/:emergencyId), opened in a second browser tab
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getMessages, onChat, sendMessage } from '../services/chatStore.js';
import { USE_MOCK, mockCrewReply, CANNED_CREW_REPLIES } from '../services/api.js';
import { formatTime } from './AlertCard.jsx';
import SimulatedBadge from './SimulatedBadge.jsx';
import { useT } from '../i18n/index.js';

export default function ChatPanel({ emergencyId, role, senderName }) {
  const messages = useSyncExternalStore(onChat, () => getMessages(emergencyId));
  const t = useT();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const box = useRef(null);

  // Keep the newest message in view.
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [messages.length]);

  async function send(body) {
    const clean = body.trim();
    if (!clean) return;
    setError('');
    try {
      await sendMessage(emergencyId, clean, role, senderName);
      setText('');
    } catch (err) {
      setError(t('chat.notSent', { msg: err.message }));
    }
  }

  return (
    <div data-testid="chat" data-role={role}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SimulatedBadge text={t('chat.badge')} />
        <span className="text-sm text-slate-500">{role === 'desk' ? t('chat.deskCrew') : t('chat.crewDesk')}</span>
      </div>

      <div ref={box} data-testid="chat-messages" className="h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
        {messages.length === 0 && <p className="text-slate-400">{t('chat.none')}</p>}
        {messages.map((m) => {
          const mine = m.sender_role === role;
          return (
            <div key={m.message_id} data-sender={m.sender_role} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? 'bg-sky-600 text-white' : 'bg-white shadow'}`}>
                <div className={`text-xs font-semibold ${mine ? 'text-sky-100' : 'text-slate-500'}`}>
                  {m.sender_name || (m.sender_role === 'crew' ? t('chat.crew') : t('chat.desk'))} · {formatTime(m.timestamp)}
                </div>
                <div className="text-lg">{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="mt-2 flex gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          send(text);
        }}
      >
        <input
          data-testid="chat-input"
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          placeholder={t('chat.placeholder')}
          maxLength={300}
          className="min-w-0 flex-1 rounded-lg border-2 border-slate-300 px-3 py-2 text-lg"
        />
        <button data-testid="chat-send" disabled={!text.trim()} className="rounded-lg bg-sky-600 px-5 py-2 text-lg font-bold text-white disabled:opacity-50">
          {t('chat.send')}
        </button>
      </form>

      {role === 'crew' && (
        <div className="mt-2 flex flex-wrap gap-2">
          {CANNED_CREW_REPLIES.map((reply) => (
            <button key={reply} data-testid="quick-reply" onClick={() => send(reply)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50">
              {reply}
            </button>
          ))}
        </div>
      )}
      {role === 'desk' && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line react/jsx-no-target-blank -- same-site link; the new tab must inherit this tab's login (sessionStorage), so no noreferrer */}
          <a href={`/crew/${emergencyId}`} target="_blank" rel="opener" data-testid="crew-link" className="font-semibold text-sky-700 underline">
            {t('chat.openCrew')}
          </a>
          {USE_MOCK && (
            <button
              data-testid="mock-crew-reply"
              onClick={() => mockCrewReply(emergencyId)}
              className="rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 px-3 py-1 font-semibold text-amber-900"
            >
              {t('chat.mockReply')}
            </button>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}
    </div>
  );
}
