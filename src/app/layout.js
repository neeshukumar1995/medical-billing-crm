import "../assets/scss/theme.scss";
import 'react-circular-progressbar/dist/styles.css';
import "react-perfect-scrollbar/dist/css/styles.css";
import "react-datepicker/dist/react-datepicker.css";
import "react-datetime/css/react-datetime.css";
import NavigationProvider from "@/contentApi/navigationProvider";
import SettingSideBarProvider from "@/contentApi/settingSideBarProvider";
import ThemeCustomizer from "@/components/shared/ThemeCustomizer";
import EchoConfig from "@/components/shared/EchoConfig";
import { UserProvider } from '@/context/UserContext';
import { StickyNotesProvider } from '@/contentApi/stickyNotesProvider'
import StickyNotesContainer from '@/components/shared/StickyNotes/StickyNotesContainer'

export const metadata = {
  title: "",
  description: "CRM is a admin Dashboard create for multipurpose,",
  icons: {
    icon: '/images/logo-abbr.png',
  },
};

const fontAwesomeLink = {
  rel: 'stylesheet',
  href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <EchoConfig />
        <UserProvider>
          <SettingSideBarProvider>
            <NavigationProvider>
              <StickyNotesProvider>
                {children}
                <StickyNotesContainer />
              </StickyNotesProvider>
            </NavigationProvider>
          </SettingSideBarProvider>
        </UserProvider>
        <ThemeCustomizer />
      </body>
    </html>
  );
}