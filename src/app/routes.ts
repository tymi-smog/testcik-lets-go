import { createBrowserRouter } from "react-router-dom";

import { Root } from "./pages/Root";
import { Home } from "./pages/Home";
import { Events } from "./pages/events";
import { ArchiveEvents } from "./pages/ArchiveEvents";
import { EventDetail } from "./pages/EventDetail";
import { Checkout } from "./pages/Checkout";

import { Login } from "./pages/login";
import { Register } from "./pages/register";
import { Profile } from "./pages/profile";
import { MyEvents } from "./pages/myevents";
import { MyTickets } from "./pages/mytickets";

import { VerifyEmail } from "./pages/VerifyEmail";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { EmailChangeSuccess } from "./pages/EmailChangeSuccess";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "events", Component: Events },
      { path: "events-archive", Component: ArchiveEvents },

      { path: "event/:id", Component: EventDetail },
      { path: "checkout", Component: Checkout },

      { path: "login", Component: Login },
      { path: "register", Component: Register },
      { path: "profile", Component: Profile },
      { path: "my-events", Component: MyEvents },
      { path: "my-tickets", Component: MyTickets },

      { path: "verify-email", Component: VerifyEmail },

      // Reset hasla flow
      { path: "forgot-password", Component: ForgotPassword },
      { path: "reset-password", Component: ResetPassword },
      { path: "email-change-success", Component: EmailChangeSuccess },
    ],
  },
]);
