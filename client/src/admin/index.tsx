import { Provider } from "react-redux";
import { adminStore } from "./store";
import { AdminLayout } from "./components/AdminLayout";

export function AdminApp() {
  return (
    <Provider store={adminStore}>
      <AdminLayout />
    </Provider>
  );
}
