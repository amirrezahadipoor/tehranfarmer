import { S, UI } from './state';

/** Single visibility rule shared by the HUD card and the structural scene mirror. */
export const isMorningReportVisible = () => Boolean(
  S.morning && !S.morning.shown && S.hour >= 5.5 && S.hour < 19 && (S.custom?.morningCard ?? true) && !UI.modal,
);
