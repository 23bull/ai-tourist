import "../global.css";
import {NextIntlClientProvider} from "next-intl";
import {getMessages} from "next-intl/server";
import LocaleSwitcher from "./components/LocaleSwitcher";
import {ReactNode} from "react";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({
  children,
  params
}: Props) {
  const {locale} = await params;   // 👈 viktigt
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div style={{maxWidth: 760, margin: "0 auto", padding: "14px 24px 0"}}>
            <div style={{display: "flex", justifyContent: "flex-end"}}>
              <LocaleSwitcher currentLocale={locale} />
            </div>
          </div>

          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}