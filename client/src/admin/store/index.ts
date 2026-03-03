import { configureStore } from "@reduxjs/toolkit";
import adminUiReducer from "./slices/adminUiSlice";

export const adminStore = configureStore({
  reducer: {
    adminUi: adminUiReducer,
  },
});

export type AdminRootState = ReturnType<typeof adminStore.getState>;
export type AdminAppDispatch = typeof adminStore.dispatch;
