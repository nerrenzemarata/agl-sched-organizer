'use client';

import { useEffect, useRef, useState } from 'react';
import Legend from '@/components/Legend';
import FreeGrid from '@/components/FreeGrid';
import CalendarGrid from '@/components/CalendarGrid';
import Lightbox from '@/components/Lightbox';
import MemberModal from '@/components/MemberModal';
import { SEED_MEMBERS, SEED_EVENTS } from '@/lib/seedData';
import { loadState, saveState, uniqueId } from '@/lib/storage';

function defaultVisible(members) {
  const v = {};
  members.forEach((m) => {
    v[m.id] = true;
  });
  return v;
}

export default function Page() {
  const [members, setMembers] = useState(SEED_MEMBERS);
  const [events, setEvents] = useState(SEED_EVENTS);
  const [visible, setVisible] = useState(() => defaultVisible(SEED_MEMBERS));
  const [ready, setReady] = useState(false);

  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    const loaded = loadState();
    setMembers(loaded.members);
    setEvents(loaded.events);
    setVisible(loaded.visible);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveState({ members, events, visible });
  }, [ready, members, events, visible]);

  function toggleVisible(id) {
    setVisible((v) => ({ ...v, [id]: !v[id] }));
  }

  function openAddModal() {
    setEditingMember(null);
    setModalOpen(true);
  }

  function openEditModal(member) {
    setEditingMember(member);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingMember(null);
  }

  function handleSaveMember(memberData, schedule) {
    if (memberData.id) {
      // editing existing member
      setMembers((ms) =>
        ms.map((m) =>
          m.id === memberData.id
            ? {
                ...m,
                name: memberData.name,
                schedulePhoto: memberData.schedulePhoto,
                color: memberData.color,
                exact: memberData.exact,
              }
            : m
        )
      );
      setEvents((ev) => ({ ...ev, [memberData.id]: schedule }));
    } else {
      const id = uniqueId(memberData.name, members.map((m) => m.id));
      setMembers((ms) => [
        ...ms,
        {
          id,
          name: memberData.name,
          schedulePhoto: memberData.schedulePhoto,
          color: memberData.color,
          exact: memberData.exact,
        },
      ]);
      setEvents((ev) => ({ ...ev, [id]: schedule }));
      setVisible((v) => ({ ...v, [id]: true }));
    }
    closeModal();
  }

  function handleDeleteMember(id) {
    setMembers((ms) => ms.filter((m) => m.id !== id));
    setEvents((ev) => {
      const next = { ...ev };
      delete next[id];
      return next;
    });
    setVisible((v) => {
      const next = { ...v };
      delete next[id];
      return next;
    });
    closeModal();
  }

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Sched Organizer</h1>
          <p className="sub">
            Everyone's weekly class schedule in one calendar, color-coded by name — so you can spot who's free,
            and when, at a glance.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={openAddModal}>
          + Add member
        </button>
      </header>

      <Legend
        members={members}
        visible={visible}
        onToggle={toggleVisible}
        onViewPhoto={(m) => setLightboxSrc(m.schedulePhoto)}
        onEdit={openEditModal}
        onAddClick={openAddModal}
      />

      <FreeGrid members={members} events={events} />

      <CalendarGrid members={members} events={events} visible={visible} />

      <footer className="note">
        Tap a name above to hide/show that person's classes on the calendar. Use the pencil icon to edit a
        member's name, color, or weekly schedule, or the camera icon to view the schedule photo they were
        transcribed from.
      </footer>

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <MemberModal
        open={modalOpen}
        member={editingMember}
        members={members}
        events={events}
        onClose={closeModal}
        onSave={handleSaveMember}
        onDelete={handleDeleteMember}
        onViewPhoto={(src) => setLightboxSrc(src)}
      />
    </div>
  );
}
