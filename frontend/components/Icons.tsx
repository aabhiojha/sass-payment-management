type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
};
function css(props: IconProps) {
  return { width: props.size ?? 18, height: props.size ?? 18 };
}
const c = (props: IconProps) => props.color ?? "currentColor";
const sw = (props: IconProps, fallback = 2.2) => props.strokeWidth ?? fallback;
const base = { fill: "none", xmlns: "http://www.w3.org/2000/svg" };

// ─── User ────────────────────────────────────────────────────────────────────

export function UserLoginIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
    </svg>
  );
}

export function UserLogoutIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function UserLoginFailedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
      <circle cx="5.5" cy="19.5" r="3.5" stroke={c(props)} strokeWidth={1.8} />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={1.8} d="M4 18l3 3M7 18l-3 3" />
    </svg>
  );
}

export function UserCreatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6" />
    </svg>
  );
}

export function UserRoleChangedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M17 8l3 3-3 3M20 11h-5" />
    </svg>
  );
}

export function UserDisabledIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={sw(props)} d="M17 12h6" />
    </svg>
  );
}

export function UserDeletedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={sw(props)} d="M17 10l5 5M22 10l-5 5" />
    </svg>
  );
}

// ─── Tenant ───────────────────────────────────────────────────────────────────

export function TenantCreatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10M19 5l2 2" />
    </svg>
  );
}

export function TenantUpdatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v4" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M14 17l1.5-1.5L14 14" />
    </svg>
  );
}

export function TenantSuspendedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M3 10.5651c0-.5744 0-.8616.074-1.126a2 2 0 0 1 .318-.6502c.1633-.2208.39-.3971.8434-.7498L10.758 2.64c.3513-.2732.527-.4099.721-.4624a1 1 0 0 1 .5226 0c.194.0525.3697.1891.721.4624l6.7823 5.2751c.4534.3527.6801.529.8434.7498.1446.1955.2524.4159.318.6502C21 9.7035 21 9.9907 21 10.5651V17.8c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874C19.48 21 18.92 21 17.8 21H6.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C3 19.48 3 18.92 3 17.8z" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={sw(props)} d="M10 13.5h4" />
    </svg>
  );
}

export function TenantReactivatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M3 10.5651c0-.5744 0-.8616.074-1.126a2 2 0 0 1 .318-.6502c.1633-.2208.39-.3971.8434-.7498L10.758 2.64c.3513-.2732.527-.4099.721-.4624a1 1 0 0 1 .5226 0c.194.0525.3697.1891.721.4624l6.7823 5.2751c.4534.3527.6801.529.8434.7498.1446.1955.2524.4159.318.6502C21 9.7035 21 9.9907 21 10.5651V17.8c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874C19.48 21 18.92 21 17.8 21H6.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C3 19.48 3 18.92 3 17.8z" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M9 12l2 2 4-3" />
    </svg>
  );
}

export function TenantArchivedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M3 10.5651c0-.5744 0-.8616.074-1.126a2 2 0 0 1 .318-.6502c.1633-.2208.39-.3971.8434-.7498L10.758 2.64c.3513-.2732.527-.4099.721-.4624a1 1 0 0 1 .5226 0c.194.0525.3697.1891.721.4624l6.7823 5.2751c.4534.3527.6801.529.8434.7498.1446.1955.2524.4159.318.6502C21 9.7035 21 9.9907 21 10.5651V15" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 19l3 3 3-3M12 22v-7" />
    </svg>
  );
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export function CustomerCreatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 21v-2c0-1.8638-1.2748-3.4299-3-3.874M15.5 3.2908C16.9659 3.8842 18 5.3213 18 7s-1.0341 3.1159-2.5 3.7092M17 21c0-1.8638 0-2.7956-.3045-3.5307a4 4 0 0 0-2.1648-2.1648C13.7956 15 12.8638 15 11 15H8c-1.8638 0-2.7957 0-3.5307.3045a4 4 0 0 0-2.1648 2.1648C2 18.2044 2 19.1362 2 21M13.5 7c0 2.2091-1.7909 4-4 4s-4-1.7909-4-4 1.7909-4 4-4 4 1.7909 4 4" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={sw(props)} d="M19.5 9v4M21.5 11h-4" />
    </svg>
  );
}

export function CustomerUpdatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 21v-2c0-1.8638-1.2748-3.4299-3-3.874M15.5 3.2908C16.9659 3.8842 18 5.3213 18 7s-1.0341 3.1159-2.5 3.7092M17 21c0-1.8638 0-2.7956-.3045-3.5307a4 4 0 0 0-2.1648-2.1648C13.7956 15 12.8638 15 11 15H8c-1.8638 0-2.7957 0-3.5307.3045a4 4 0 0 0-2.1648 2.1648C2 18.2044 2 19.1362 2 21M13.5 7c0 2.2091-1.7909 4-4 4s-4-1.7909-4-4 1.7909-4 4-4 4 1.7909 4 4" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M18 9.5l1.5 1.5 2.5-3" />
    </svg>
  );
}

export function CustomerDeletedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 21v-2c0-1.8638-1.2748-3.4299-3-3.874M15.5 3.2908C16.9659 3.8842 18 5.3213 18 7s-1.0341 3.1159-2.5 3.7092M17 21c0-1.8638 0-2.7956-.3045-3.5307a4 4 0 0 0-2.1648-2.1648C13.7956 15 12.8638 15 11 15H8c-1.8638 0-2.7957 0-3.5307.3045a4 4 0 0 0-2.1648 2.1648C2 18.2044 2 19.1362 2 21M13.5 7c0 2.2091-1.7909 4-4 4s-4-1.7909-4-4 1.7909-4 4-4 4 1.7909 4 4" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={2} d="M18 9l4 4M22 9l-4 4" />
    </svg>
  );
}

// ─── Product ──────────────────────────────────────────────────────────────────

export function ProductCreatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M8 8h.01M2 5.2v4.4745c0 .4892 0 .7338.0553.964.049.204.1298.3991.2394.5781.1237.2018.2966.3748.6426.7207l5.6686 5.6686c1.188 1.188 1.7821 1.7821 2.467 2.0046a3 3 0 0 0 1.8541 0c.685-.2225 1.2791-.8166 2.4671-2.0046l1.2118-1.2118" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={sw(props)} d="M18 9v6M21 12h-6" />
      <circle cx="8.5" cy="8" r=".5" stroke={c(props)} strokeWidth={1.5} />
    </svg>
  );
}

export function ProductUpdatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M8 8h.01M2 5.2v4.4745c0 .4892 0 .7338.0553.964.049.204.1298.3991.2394.5781.1237.2018.2966.3748.6426.7207l7.6686 7.6686c1.188 1.188 1.7821 1.7821 2.467 2.0046a3 3 0 0 0 1.8541 0c.685-.2225 1.2791-.8166 2.4671-2.0046l2.2118-2.2118c1.188-1.188 1.7821-1.7821 2.0046-2.4671a3 3 0 0 0 0-1.8541c-.2225-.6849-.8166-1.279-2.0046-2.467l-7.6686-7.6686c-.3459-.346-.5189-.5189-.7207-.6426a2 2 0 0 0-.5781-.2394C10.4083 2 10.1637 2 9.6745 2H5.2c-1.1201 0-1.6802 0-2.108.218a2 2 0 0 0-.874.874C2 3.5198 2 4.08 2 5.2M8.5 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M17 14.5l1.2 1.2 2-2.2" />
    </svg>
  );
}

export function ProductDeletedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M8 8h.01M2 5.2v4.4745c0 .4892 0 .7338.0553.964.049.204.1298.3991.2394.5781.1237.2018.2966.3748.6426.7207l7.6686 7.6686c1.188 1.188 1.7821 1.7821 2.467 2.0046a3 3 0 0 0 1.8541 0c.685-.2225 1.2791-.8166 2.4671-2.0046l2.2118-2.2118c1.188-1.188 1.7821-1.7821 2.0046-2.4671a3 3 0 0 0 0-1.8541c-.2225-.6849-.8166-1.279-2.0046-2.467l-7.6686-7.6686c-.3459-.346-.5189-.5189-.7207-.6426a2 2 0 0 0-.5781-.2394C10.4083 2 10.1637 2 9.6745 2H5.2c-1.1201 0-1.6802 0-2.108.218a2 2 0 0 0-.874.874C2 3.5198 2 4.08 2 5.2M8.5 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={1.8} d="M16.5 13.5l3 3M19.5 13.5l-3 3" />
    </svg>
  );
}

export function ProductActivatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M8 8h.01M2 5.2v4.4745c0 .4892 0 .7338.0553.964.049.204.1298.3991.2394.5781.1237.2018.2966.3748.6426.7207l5.5 5.5" />
      <circle cx="17" cy="17" r="4.5" stroke={c(props)} strokeWidth={2} />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 17l1.5 1.5 2.5-2.5" />
      <circle cx="8.5" cy="8" r=".5" stroke={c(props)} strokeWidth={1.5} />
    </svg>
  );
}

export function ProductDeactivatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M8 8h.01M2 5.2v4.4745c0 .4892 0 .7338.0553.964.049.204.1298.3991.2394.5781.1237.2018.2966.3748.6426.7207l5.5 5.5" />
      <circle cx="17" cy="17" r="4.5" stroke={c(props)} strokeWidth={2} />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={2} d="M15 15l4 4M19 15l-4 4" />
      <circle cx="8.5" cy="8" r=".5" stroke={c(props)} strokeWidth={1.5} />
    </svg>
  );
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export function SubscriptionCreatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 10H2m0-1.8v7.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C3.52 19 4.08 19 5.2 19h13.6c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874C22 17.48 22 16.92 22 15.8V8.2c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C20.48 5 19.92 5 18.8 5H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 6.52 2 7.08 2 8.2" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={2} d="M7 14h4M11 14v-4M11 14h4" />
    </svg>
  );
}

export function SubscriptionUpdatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 10H2m0-1.8v7.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C3.52 19 4.08 19 5.2 19h7.8" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M19.5 14.5l-5.5.5.5-5.5 5 5zM15.5 15.5l3 3" />
    </svg>
  );
}

export function SubscriptionActivatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 10H2m0-1.8v7.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C3.52 19 4.08 19 5.2 19h13.6c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874C22 17.48 22 16.92 22 15.8V8.2c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C20.48 5 19.92 5 18.8 5H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 6.52 2 7.08 2 8.2" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 14l2.5 2L13 12" />
    </svg>
  );
}

export function SubscriptionPausedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 10H2m0-1.8v7.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C3.52 19 4.08 19 5.2 19h13.6c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874C22 17.48 22 16.92 22 15.8V8.2c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C20.48 5 19.92 5 18.8 5H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 6.52 2 7.08 2 8.2" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={sw(props)} d="M8.5 12v4M11.5 12v4" />
    </svg>
  );
}

export function SubscriptionCancelledIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 10H2m0-1.8v7.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C3.52 19 4.08 19 5.2 19h13.6c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874C22 17.48 22 16.92 22 15.8V8.2c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C20.48 5 19.92 5 18.8 5H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 6.52 2 7.08 2 8.2" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={2} d="M7 12l6 4M13 12l-6 4" />
    </svg>
  );
}

/** Same as SubscriptionCancelledIcon but with a small refresh indicator */
export function SubscriptionAutoCancelledIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 10H2m0-1.8v7.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C3.52 19 4.08 19 5.2 19h13.6c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874C22 17.48 22 16.92 22 15.8V8.2c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C20.48 5 19.92 5 18.8 5H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 6.52 2 7.08 2 8.2" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={1.8} d="M7 12l5 3.5M12 12l-5 3.5" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M15.5 12c.3-.8 1.1-1.5 2-1.5 1.1 0 2 .9 2 2s-.9 2-2 2h-.5M16.5 15.5l.5-1h.5" />
    </svg>
  );
}

export function SubscriptionDeletedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M3 6h18M8 6V4h8v2M19 6l-.867 12.142C18.053 19.172 17.108 20 16 20H8c-1.108 0-2.053-.828-2.133-1.858L5 6" />
    </svg>
  );
}

// ─── Invitation ───────────────────────────────────────────────────────────────

export function InvitationCreatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 12V8.2c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C20.48 5 19.92 5 18.8 5H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 6.52 2 7.08 2 8.2v7.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C3.52 19 4.08 19 5.2 19H14M2 8l10 6 10-6" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={2} d="M17 17v4M19 19h-4" />
    </svg>
  );
}

export function InvitationRevokedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 12V8.2c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C20.48 5 19.92 5 18.8 5H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 6.52 2 7.08 2 8.2v7.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C3.52 19 4.08 19 5.2 19H14M2 8l10 6 10-6" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={2} d="M15.5 15.5l4 4M19.5 15.5l-4 4" />
    </svg>
  );
}

export function InvitationAcceptedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 12V8.2c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C20.48 5 19.92 5 18.8 5H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 6.52 2 7.08 2 8.2v7.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C3.52 19 4.08 19 5.2 19H14M2 8l10 6 10-6" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 17.5l2 2 4-3.5" />
    </svg>
  );
}

// ─── Platform plan ────────────────────────────────────────────────────────────

export function PlatformPlanCreatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={2} d="M18 19v4M20 21h-4" />
    </svg>
  );
}

export function PlatformPlanUpdatedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M17.5 18l1.5 1.5 2.5-2.5" />
    </svg>
  );
}

export function PlatformPlanArchivedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M12 2v14M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 19l3 3 3-3" />
    </svg>
  );
}

export function TenantPlanAssignedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M12 3v10M17 6H9.5a3.5 3.5 0 0 0 0 7h3M15 15h6M18 12l3 3-3 3" />
    </svg>
  );
}

// ─── Password reset ───────────────────────────────────────────────────────────

export function PasswordResetRequestedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <rect x="3" y="11" width="18" height="11" rx="2" stroke={c(props)} strokeWidth={sw(props)}
        strokeLinecap="round" strokeLinejoin="round" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M7 11V7a5 5 0 0 1 9.9-1" />
      <path stroke={c(props)} strokeLinecap="round" strokeWidth={sw(props)} d="M12 15v2" />
    </svg>
  );
}

export function PasswordResetCompletedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <rect x="3" y="11" width="18" height="11" rx="2" stroke={c(props)} strokeWidth={sw(props)}
        strokeLinecap="round" strokeLinejoin="round" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M7 11V7a5 5 0 0 1 10 0v4" />
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.5 16.5l2 2 3.5-3" />
    </svg>
  );
}

// ─── Sidebar nav icons ─────────────────────────────────────────────────────────

export function HomeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M3 10.5651c0-.5744 0-.8616.074-1.126a2 2 0 0 1 .318-.6502c.1633-.2208.39-.3971.8434-.7498l6.7823-5.2751c.3513-.2732.527-.4099.721-.4624a1 1 0 0 1 .5226 0c.194.0525.3697.1891.721.4624l6.7823 5.2751c.4534.3527.6801.529.8434.7498.1446.1955.2524.4159.318.6502.074.2644.074.5516.074 1.126V17.8c0 1.1201 0 1.6801-.218 2.108a2 2 0 0 1-.874.874C19.4802 21 18.9201 21 17.8 21H6.2c-1.1201 0-1.6802 0-2.108-.218a2 2 0 0 1-.874-.874C3 19.4801 3 18.9201 3 17.8z" />
    </svg>
  );
}

export function TenantsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 21v-2c0-1.8638-1.2748-3.4299-3-3.874M15.5 3.2908C16.9659 3.8842 18 5.3213 18 7s-1.0341 3.1159-2.5 3.7092M17 21c0-1.8638 0-2.7956-.3045-3.5307a4 4 0 0 0-2.1648-2.1648C13.7956 15 12.8638 15 11 15H8c-1.8638 0-2.7957 0-3.5307.3045a4 4 0 0 0-2.1648 2.1648C2 18.2044 2 19.1362 2 21M13.5 7c0 2.2091-1.7909 4-4 4s-4-1.7909-4-4 1.7909-4 4-4 4 1.7909 4 4" />
    </svg>
  );
}

export const CustomersIcon = TenantsIcon;

export function SubscriptionsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M22 10H2m0-1.8v7.6c0 1.1201 0 1.6802.218 2.108.1917.3763.4977.6823.874.874C3.5198 19 4.08 19 5.2 19h13.6c1.1201 0 1.6802 0 2.108-.218a2 2 0 0 0 .874-.874C22 17.4802 22 16.9201 22 15.8V8.2c0-1.1201 0-1.6802-.218-2.108a2 2 0 0 0-.874-.874C20.4802 5 19.9201 5 18.8 5H5.2c-1.1201 0-1.6802 0-2.108.218a2 2 0 0 0-.874.874C2 6.5198 2 7.08 2 8.2" />
    </svg>
  );
}

export function ProductsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M8 8h.01M2 5.2v4.4745c0 .4892 0 .7338.0553.964.049.204.1298.3991.2394.5781.1237.2018.2966.3748.6426.7207l7.6686 7.6686c1.188 1.188 1.7821 1.7821 2.467 2.0046a3 3 0 0 0 1.8541 0c.685-.2225 1.2791-.8166 2.4671-2.0046l2.2118-2.2118c1.188-1.188 1.7821-1.7821 2.0046-2.4671a3 3 0 0 0 0-1.8541c-.2225-.6849-.8166-1.279-2.0046-2.467l-7.6686-7.6686c-.3459-.346-.5189-.5189-.7207-.6426a2 2 0 0 0-.5781-.2394C10.4083 2 10.1637 2 9.6745 2H5.2c-1.1201 0-1.6802 0-2.108.218a2 2 0 0 0-.874.874C2 3.5198 2 4.08 2 5.2M8.5 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0" />
    </svg>
  );
}

export function PlansIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export function AuditLogIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="m12.7076 18.3639-1.4143 1.4142c-1.9526 1.9527-5.1184 1.9527-7.071 0-1.9526-1.9526-1.9526-5.1184 0-7.071l1.4142-1.4142m12.7279 1.4142 1.4142-1.4142c1.9526-1.9527 1.9526-5.1185 0-7.0711s-5.1184-1.9526-7.071 0L11.2933 5.636m-2.7928 9.8639 7-7" />
    </svg>
  );
}

export function ReminderIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M9.3542 21c.7051.6224 1.6314 1 2.6458 1a3.984 3.984 0 0 0 2.6458-1M18 8A6 6 0 1 0 6 8c0 3.0902-.7795 5.206-1.6503 6.6054-.7346 1.1805-1.1018 1.7707-1.0884 1.9354.015.1823.0536.2518.2005.3608C3.5945 17 4.1926 17 5.3888 17h13.2224c1.1962 0 1.7944 0 1.927-.0984.147-.109.1856-.1785.2005-.3608.0135-.1647-.3538-.7549-1.0883-1.9354C18.7795 13.206 18 11.0902 18 8" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props)}
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm6 9 1.5 1.5L21 11" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props, 2.5)}
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function PayNextLogo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...css(props)} className={props.className}>
      <path stroke={c(props) === "currentColor" ? "var(--primary)" : c(props)} strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw(props, 2)}
        d="M6 11v4m12-6v4m-1-9c2.4487 0 3.7731.3748 4.4321.6654.0878.0388.1317.0581.2583.179.0759.0724.2145.285.2501.3837.0595.1646.0595.2546.0595.4346v10.7484c0 .9088 0 1.3632-.1363 1.5968-.1386.2375-.2723.348-.5318.4393-.255.0897-.7699-.0092-1.7997-.2071A13.45 13.45 0 0 0 17 18c-3 0-6 2-10 2-2.4487 0-3.7731-.3748-4.4321-.6654-.0878-.0388-.1317-.0581-.2583-.179-.076-.0724-.2145-.285-.2501-.3837C2 18.6073 2 18.5173 2 18.3373V7.5889c0-.9088 0-1.3632.1363-1.5968.1386-.2375.2723-.348.5318-.4393.255-.0898.77.0092 1.7997.207A13.44 13.44 0 0 0 7 6c3 0 6-2 10-2m-2.5 8c0 1.3807-1.1193 2.5-2.5 2.5S9.5 13.3807 9.5 12s1.1193-2.5 2.5-2.5 2.5 1.1193 2.5 2.5" />
    </svg>
  );
}

/** Alias used by sidebar */
export const LogoutIcon = UserLogoutIcon;
export const AuditIcon = AuditLogIcon;