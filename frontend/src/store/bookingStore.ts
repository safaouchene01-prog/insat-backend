import { create } from 'zustand';

interface BookingState {
  isBookingModalOpen: boolean;
  selectedDoctor: any | null;
  selectedClinic: any | null;
  openBookingModal: (doctor?: any, clinic?: any) => void;
  closeBookingModal: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  isBookingModalOpen: false,
  selectedDoctor: null,
  selectedClinic: null,
  openBookingModal: (doctor, clinic) => set({ isBookingModalOpen: true, selectedDoctor: doctor || null, selectedClinic: clinic || null }),
  closeBookingModal: () => set({ isBookingModalOpen: false, selectedDoctor: null, selectedClinic: null }),
}));
