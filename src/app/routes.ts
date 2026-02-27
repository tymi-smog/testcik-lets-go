import { createBrowserRouter } from "react-router-dom";

import { Root } from "./pages/Root";
import { Home } from "./pages/Home";
import { EventDetail } from "./pages/EventDetail";
import { Checkout } from "./pages/Checkout";

import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Profile } from "./pages/Profile";
import { MyEvents } from "./pages/MyEvents";

import { VerifyEmail } from "./pages/VerifyEmail";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },

      { path: "event/:id", Component: EventDetail },
      { path: "checkout", Component: Checkout },

      { path: "login", Component: Login },
      { path: "register", Component: Register },
      { path: "profile", Component: Profile },
      { path: "my-events", Component: MyEvents },

      { path: "verify-email", Component: VerifyEmail },

      // 🔐 Reset hasła flow
      { path: "forgot-password", Component: ForgotPassword },
      { path: "reset-password", Component: ResetPassword },
    ],
  },
]);
