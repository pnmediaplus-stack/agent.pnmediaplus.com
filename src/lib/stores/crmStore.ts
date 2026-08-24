import { create } from 'zustand';

export type CrmCustomer = {
  id: string;
  full_name: string;
  phone_number: string | null;
  address: string | null;
  email: string | null;
  notes: string | null;
  tags: string[];
  lead_score: number;
};

export type CrmThread = {
  id: string;
  channel_id: string;
  customer_id: string;
  status: 'bot_handling' | 'human_handling' | 'resolved';
  last_message_at: string;
  unread_count: number;
  customer?: CrmCustomer;
  channel?: {
    channel_name: string;
    channel_type: string;
    avatar_url: string;
  };
};

export type CrmMessage = {
  id: string;
  thread_id: string;
  sender_type: 'customer' | 'bot' | 'human';
  content: string;
  delivery_status: 'queued' | 'sent' | 'delivered' | 'failed';
  created_at: string;
};

interface CrmState {
  threads: CrmThread[];
  messages: Record<string, CrmMessage[]>; // Keyed by thread_id
  activeThreadId: string | null;
  isLoadingThreads: boolean;
  
  // Actions
  setThreads: (threads: CrmThread[]) => void;
  upsertThread: (thread: CrmThread) => void;
  setActiveThreadId: (id: string | null) => void;
  
  setMessages: (threadId: string, messages: CrmMessage[]) => void;
  addMessage: (message: CrmMessage) => void;
  updateMessageStatus: (id: string, threadId: string, status: CrmMessage['delivery_status']) => void;
  
  updateCustomerProfile: (threadId: string, updates: Partial<CrmCustomer>) => void;
}

export const useCrmStore = create<CrmState>((set) => ({
  threads: [],
  messages: {},
  activeThreadId: null,
  isLoadingThreads: true,

  setThreads: (threads) => set({ threads, isLoadingThreads: false }),
  
  upsertThread: (newThread) => set((state) => {
    const exists = state.threads.find(t => t.id === newThread.id);
    if (exists) {
      return {
        threads: state.threads.map(t => t.id === newThread.id ? { ...t, ...newThread } : t)
      };
    }
    // New thread goes to top
    return { threads: [newThread, ...state.threads] };
  }),

  setActiveThreadId: (id) => set({ activeThreadId: id }),

  setMessages: (threadId, messages) => set((state) => ({
    messages: {
      ...state.messages,
      [threadId]: messages
    }
  })),

  addMessage: (message) => set((state) => {
    const threadMessages = state.messages[message.thread_id] || [];
    // Ignore if already exists (idempotency in UI)
    if (threadMessages.find(m => m.id === message.id)) return state;
    
    return {
      messages: {
        ...state.messages,
        [message.thread_id]: [...threadMessages, message]
      }
    };
  }),

  updateMessageStatus: (id, threadId, status) => set((state) => {
    const threadMessages = state.messages[threadId] || [];
    return {
      messages: {
        ...state.messages,
        [threadId]: threadMessages.map(m => m.id === id ? { ...m, delivery_status: status } : m)
      }
    };
  }),

  updateCustomerProfile: (threadId, updates) => set((state) => {
    return {
      threads: state.threads.map(t => {
        if (t.id === threadId && t.customer) {
          return {
            ...t,
            customer: {
              ...t.customer,
              ...updates
            }
          };
        }
        return t;
      })
    };
  })
}));
