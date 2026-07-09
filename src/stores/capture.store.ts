import { create } from 'zustand';

interface CaptureState {
  recordingUri: string | null;
  isRecording: boolean;
  isPaused: boolean;
  hasRecorded: boolean;
  memoId: string | null;
  isProcessing: boolean;
  hasProcessingError: boolean;
  processingError: string | null;
  extractedName: string | null;
  extractedNameNative: string | null;
  extractedContextPoints: string[] | null;
  extractedFollowUpDate: string | null;
  extractedFollowUpIntent: string | null;
  isExtractionComplete: boolean;
  linkedContactId: string | null;
  isNewContact: boolean;
  hadMissingFields: boolean;
  setRecordingUri: (uri: string | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setIsPaused: (isPaused: boolean) => void;
  setHasRecorded: (hasRecorded: boolean) => void;
  setMemoId: (id: string | null) => void;
  setIsProcessing: (b: boolean) => void;
  setHasProcessingError: (b: boolean) => void;
  setProcessingError: (message: string | null) => void;
  setExtractedName: (name: string | null) => void;
  setExtractedNameNative: (name: string | null) => void;
  setExtractedContextPoints: (points: string[] | null) => void;
  setExtractedFollowUpDate: (date: string | null) => void;
  setExtractedFollowUpIntent: (intent: string | null) => void;
  setIsExtractionComplete: (b: boolean) => void;
  setLinkedContactId: (id: string | null) => void;
  setIsNewContact: (b: boolean) => void;
  setHadMissingFields: (b: boolean) => void;
  reset: () => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  recordingUri: null,
  isRecording: false,
  isPaused: false,
  hasRecorded: false,
  memoId: null,
  isProcessing: false,
  hasProcessingError: false,
  processingError: null,
  extractedName: null,
  extractedNameNative: null,
  extractedContextPoints: null,
  extractedFollowUpDate: null,
  extractedFollowUpIntent: null,
  isExtractionComplete: false,
  linkedContactId: null,
  isNewContact: false,
  hadMissingFields: false,
  setRecordingUri: (uri) => set({ recordingUri: uri }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setHasRecorded: (hasRecorded) => set({ hasRecorded }),
  setMemoId: (id) => set({ memoId: id }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setHasProcessingError: (hasProcessingError) => set({ hasProcessingError }),
  setProcessingError: (processingError) => set({ processingError }),
  setExtractedName: (extractedName) => set({ extractedName }),
  setExtractedNameNative: (extractedNameNative) => set({ extractedNameNative }),
  setExtractedContextPoints: (extractedContextPoints) => set({ extractedContextPoints }),
  setExtractedFollowUpDate: (extractedFollowUpDate) => set({ extractedFollowUpDate }),
  setExtractedFollowUpIntent: (extractedFollowUpIntent) => set({ extractedFollowUpIntent }),
  setIsExtractionComplete: (isExtractionComplete) => set({ isExtractionComplete }),
  setLinkedContactId: (linkedContactId) => set({ linkedContactId }),
  setIsNewContact: (isNewContact) => set({ isNewContact }),
  setHadMissingFields: (hadMissingFields) => set({ hadMissingFields }),
  reset: () =>
    set({
      recordingUri: null,
      isRecording: false,
      isPaused: false,
      hasRecorded: false,
      memoId: null,
      isProcessing: false,
      hasProcessingError: false,
      processingError: null,
      extractedName: null,
      extractedNameNative: null,
      extractedContextPoints: null,
      extractedFollowUpDate: null,
      extractedFollowUpIntent: null,
      isExtractionComplete: false,
      linkedContactId: null,
      isNewContact: false,
      hadMissingFields: false,
    }),
}));
