import { Language, Message } from './types';

/**
 * Formats a user message to ensure it ends with a question mark if it sounds like a question.
 */
export const formatUserMessage = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/[.!?]$/.test(trimmed)) return trimmed;

  const questionMarkers = [
    // ID
    'apa', 'siapa', 'dimana', 'di mana', 'kapan', 'mengapa', 'kenapa', 'bagaimana', 'berapa', 'mana', 'apakah', 'siapakah', 'manakah', 'bolehkah', 'bisakah',
    // SU
    'naon', 'saha', 'iraha', 'naha', 'kumaha', 'sabaraha', 'dupi', 'naha',
    // EN
    'what', 'who', 'where', 'when', 'why', 'how', 'which', 'do ', 'does ', 'did ', 'is ', 'are ', 'can ', 'could '
  ];

  const lowerText = trimmed.toLowerCase();

  const isQuestion = questionMarkers.some(marker =>
    lowerText.startsWith(marker) || lowerText.includes(' ' + marker)
  ) || lowerText.endsWith(' ya') || lowerText.endsWith(' nya');

  return isQuestion ? `${trimmed}?` : trimmed;
};

/**
 * Formats a timestamp into a 2-digit hour:minute string.
 */
export const formatTime = (ts: number): string => {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Dictionary of UI strings for supported languages.
 */
export const UI_STRINGS = {
  su: {
    title: "VibeLocator",
    subtitle: "\"Poho disimpen dimana? Kalem bae... ViLo siap nambihan ingetan.\"",
    placeholder: "Milari naon yeuh?",
    listTitle: "Barang nu tos disimpen",
    empty: "Kosong keneh yeuh. Pencet Mic geura!",
    historyEmpty: "Teu acan aya obrolan, Lur.",
    clearItems: "Hapus Sadaya Barang",
    clearHistory: "Bersihkeun Obrolan",
    historyTitle: "Catetan Obrolan",
    confirmClear: "Yakin bade dihapus sadayana?",
    voiceOn: "Mode Sora: HURUNG",
    voiceOff: "Mode Sora: PAREUM",
    alwaysOnMode: "Always On (Aktif)",
    alwaysOnOff: "Always On: OFF",
    standbyLabel: "Standby:",
    standbyIndicator: "ViLo Standby: Saurkeun \"Hey ViLo\"",
    smuTag: "Memori Semantik",
    youName: "Anjeun",
    listening: "Nuju Ngupingkeun...",
    thinking: "Sakedap, nuju diolah...",
    manualPlaceholder: "Ketik di dieu bilih hoream nyarios...",
    sendBtn: "Gas!",
    allBtn: "Sadayana",
    footerThanks: "Hatur Nuhun!",
    scrollToTop: "Ka Luhur",
    quotaLabel: "Status Kuota AI",
    hqToggle: "Sora High-Quality",
    voiceTooltip: "Hurungkeun/Pareumkeun Sora AI",
    wakeTooltip: "Nguping Tuluy (Saurkeun 'Hey ViLo')",
    feedbackSubject: "Laporan Masalah ViLo",
    feedbackBody: "Sampurasun Nandur Studio,\n\nPunten, abdi mendak masalah dina ViLo:\n\n[Seratkeun masalahna di dieu]",
    speedLabel: "Laju Sora",
    browserWarning: "Punten, browser ieu teu acan ngarojong Mic sacara pinuh. Cobian nganggo Chrome atanapi Edge nya Kak.",
    storageLabel: "Kapasitas Inventaris",
    capacityFull: "Inventaris Pinuh!"
  },
  id: {
    title: "VibeLocator",
    subtitle: "\"Lupa naruh dimana? Chill aja, Kak... ViLo back-up ingatanmu.\"",
    placeholder: "Lagi nyari apa, Kak?",
    listTitle: "Daftar Barang Kamu",
    empty: "Masih kosong melompong nih, Kak.",
    historyEmpty: "Belum ada obrolan nih, Kak.",
    clearItems: "Kosongkan Semua Barang",
    clearHistory: "Hapus Riwayat Chat",
    historyTitle: "Riwayat Obrolan",
    confirmClear: "Serius mau dihapus semua, Kak? No regret?",
    voiceOn: "Voice Response: ON",
    voiceOff: "Voice Response: OFF",
    alwaysOnMode: "Always On Mode (Non-stop)",
    alwaysOnOff: "Always On: OFF",
    standbyLabel: "Status:",
    standbyIndicator: "ViLo Standby: Panggil \"Hey ViLo\"",
    smuTag: "Semantic Memory Unit",
    youName: "Kamu",
    listening: "Lagi Dengerin...",
    thinking: "Lagi Loading...",
    manualPlaceholder: "Tulis di sini kalo lagi mager ngomong...",
    sendBtn: "Kirim",
    allBtn: "All",
    footerThanks: "Thank You, Kak!",
    scrollToTop: "Ke Atas",
    quotaLabel: "Status Kuota AI",
    hqToggle: "Suara High-Quality",
    voiceTooltip: "Aktifkan/Matikan Suara AI",
    wakeTooltip: "Selalu Mendengarkan (Panggil 'Hey ViLo')",
    feedbackSubject: "Laporan Error ViLo",
    feedbackBody: "Halo Nandur Studio,\n\nSaya menemukan masalah pada ViLo:\n\n[Tuliskan deskripsi masalah di sini]",
    speedLabel: "Kecepatan Suara",
    browserWarning: "Maaf, browser ini belum mendukung fitur Mic sepenuhnya. Coba pakai Chrome atau Edge ya Kak.",
    storageLabel: "Kapasitas Inventaris",
    capacityFull: "Inventaris Penuh!"
  },
  en: {
    title: "VibeLocator",
    subtitle: "\"Lost your stuff? Chill... ViLo's got your back, Champ.\"",
    placeholder: "What are we looking for?",
    listTitle: "Your Stored Vibes",
    empty: "Nothing here yet. Try the Mic!",
    historyEmpty: "No chat history yet. Say hi!",
    clearItems: "Clear All Records",
    clearHistory: "Clear Chat History",
    historyTitle: "Chat History",
    confirmClear: "Sure you want to wipe everything?",
    voiceOn: "Voice: ON",
    voiceOff: "Voice: OFF",
    alwaysOnMode: "Always On (Active)",
    alwaysOnOff: "Always On: OFF",
    standbyLabel: "Standby:",
    standbyIndicator: "ViLo Standby: Say \"Hey ViLo\"",
    smuTag: "Semantic Memory Unit",
    youName: "You",
    listening: "Listening...",
    thinking: "Processing...",
    manualPlaceholder: "Type here if you're feeling shy...",
    sendBtn: "Send",
    allBtn: "All",
    footerThanks: "Cheers!",
    scrollToTop: "Top",
    quotaLabel: "AI Quota Status",
    hqToggle: "High-Quality Audio",
    voiceTooltip: "Toggle AI Voice Response",
    wakeTooltip: "Always Listening (Say 'Hey ViLo')",
    feedbackSubject: "ViLo Error Report",
    feedbackBody: "Hello Nandur Studio,\n\nI encountered an issue with ViLo:\n\n[Write more details here]",
    speedLabel: "Voice Speed",
    browserWarning: "Sorry, this browser doesn't fully support Mic features. Please try Chrome or Edge.",
    storageLabel: "Inventory Capacity",
    capacityFull: "Inventory Full!"
  }
};

export const getUiStrings = (lang: Language) => UI_STRINGS[lang];

/**
 * Returns the STT language code for a given app language.
 */
export const getSTTLanguageCode = (lang: Language) => {
  if (lang === 'su') return 'su-ID';
  if (lang === 'id') return 'id-ID';
  return 'en-US';
};

/**
 * Groups messages by date labels (Today, Yesterday, or formatted date).
 */
export const groupMessagesByDate = (msgs: Message[], language: Language) => {
  const groups: { label: string; messages: Message[] }[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;

  msgs.forEach(msg => {
    let label = '';
    if (msg.timestamp >= today) {
      label = language === 'en' ? 'Today' : (language === 'id' ? 'Hari Ini' : 'Dinten Ieu');
    } else if (msg.timestamp >= yesterday) {
      label = language === 'en' ? 'Yesterday' : (language === 'id' ? 'Kemarin' : 'Kamari');
    } else {
      const date = new Date(msg.timestamp);
      label = date.toLocaleDateString(language === 'en' ? 'en-US' : (language === 'id' ? 'id-ID' : 'id-ID'), {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }

    const existingGroup = groups.find(g => g.label === label);
    if (existingGroup) {
      existingGroup.messages.push(msg);
    } else {
      groups.push({ label, messages: [msg] });
    }
  });

  return groups;
};
