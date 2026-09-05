'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Legend from '@/components/Legend';
import FreeGrid from '@/components/FreeGrid';
import CalendarGrid from '@/components/CalendarGrid';
import Lightbox from '@/components/Lightbox';
import MemberModal from '@/components/MemberModal';
import { loadState, saveState, uniqueId, getOrganizer, renameOrganizer } from '@/lib/storage';

function defaultVisible(members) {
  const v = {};
  members.forEach((m) => {
    v[m.id] = true;
  });
  return v;
}

export default function OrganizerPage() {
  const { id } = useParams();
  const router = useRouter();

  const [organizer, setOrganizer] = useState(null);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState({});
  const [visible, setVisible] = useState({});
  const [ready, setReady] = useState(false);

  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoadError('');
    (async () => {
      try {
        const [org, loaded] = await Promise.all([getOrganizer(id), loadState(id)]);
        if (cancelled) return;
        setOrganizer(org);
        setMembers(loaded.members);
        setEvents(loaded.events);
        setVisible(loaded.visible);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load this Schedule Organizer.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!ready || loadError) return;
    saveState(id, { members, events, visible });
  }, [ready, loadError, id, members, events, visible]);

  function toggleVisible(memberId) {
    setVisible((v) => ({ ...v, [memberId]: !v[memberId] }));
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

  async function handleRenameOrganizer() {
    const next = window.prompt('Rename this Schedule Organizer', organizer?.name || '');
    if (next === null) return;
    const name = next.trim();
    if (!name) return;
    try {
      await renameOrganizer(id, name);
      setOrganizer((o) => (o ? { ...o, name } : o));
    } catch (err) {
      window.alert(err.message || 'Could not rename this Schedule Organizer.');
    }
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
                photo: memberData.photo,
                schedulePhoto: memberData.schedulePhoto,
                color: memberData.color,
                exact: memberData.exact,
              }
            : m
        )
      );
      setEvents((ev) => ({ ...ev, [memberData.id]: schedule }));
    } else {
      const newId = uniqueId(memberData.name, members.map((m) => m.id));
      setMembers((ms) => [
        ...ms,
        {
          id: newId,
          name: memberData.name,
          photo: memberData.photo,
          schedulePhoto: memberData.schedulePhoto,
          color: memberData.color,
          exact: memberData.exact,
        },
      ]);
      setEvents((ev) => ({ ...ev, [newId]: schedule }));
      setVisible((v) => ({ ...v, [newId]: true }));
    }
    closeModal();
  }

  function handleDeleteMember(memberId) {
    setMembers((ms) => ms.filter((m) => m.id !== memberId));
    setEvents((ev) => {
      const next = { ...ev };
      delete next[memberId];
      return next;
    });
    setVisible((v) => {
      const next = { ...v };
      delete next[memberId];
      return next;
    });
    closeModal();
  }

  if (ready && (loadError || !organizer)) {
    return (
      <div className="wrap">
        <header className="top">
          <div>
            <h1>{loadError ? 'Could not load this board' : 'Organizer not found'}</h1>
            <p className="sub">
              {loadError || "This Schedule Organizer doesn't exist, or its link is wrong."}
            </p>
          </div>
          <button type="button" className="btn primary" onClick={() => router.push('/')}>
            ← All Organizers
          </button>
        </header>
      </div>
    );
  }

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <p className="sub" style={{ marginBottom: 6 }}>
            <a href="/" className="crumb-back">
              ← All Organizers
            </a>
          </p>
          <h1>{organizer?.name || 'Sched Organizer'}</h1>
          <p className="sub">
            Everyone's weekly class schedule in one calendar, color-coded by name — so you can spot who's free,
            and when, at a glance.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn" onClick={handleRenameOrganizer}>
            Rename
          </button>
          <button type="button" className="btn primary" onClick={openAddModal}>
            + Add member
          </button>
        </div>
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
