// Shared SVG icon components
// Uses Lucide-style icons for consistency

import { type SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
    size?: number;
};

function Icon({
    size = 16,
    className = '',
    children,
    ...props
}: IconProps & { children: React.ReactNode }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
            strokeLinecap='round'
            strokeLinejoin='round'
            className={className}
            {...props}
        >
            {children}
        </svg>
    );
}

// ─── Navigation / View Icons ───

export function SignalIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M2 12h2' />
            <path d='M6 8v8' />
            <path d='M10 4v16' />
            <path d='M14 6v12' />
            <path d='M18 10v4' />
            <path d='M22 12h-2' />
        </Icon>
    );
}

export function TargetIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx='12' cy='12' r='10' />
            <circle cx='12' cy='12' r='6' />
            <circle cx='12' cy='12' r='2' />
        </Icon>
    );
}

export function BuildingIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <rect x='4' y='2' width='16' height='20' rx='2' ry='2' />
            <path d='M9 22v-4h6v4' />
            <path d='M8 6h.01' />
            <path d='M16 6h.01' />
            <path d='M12 6h.01' />
            <path d='M12 10h.01' />
            <path d='M12 14h.01' />
            <path d='M16 10h.01' />
            <path d='M16 14h.01' />
            <path d='M8 10h.01' />
            <path d='M8 14h.01' />
        </Icon>
    );
}

export function BrainIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54' />
            <path d='M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54' />
        </Icon>
    );
}

export function WalletIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M21 12V7H5a2 2 0 0 1 0-4h14v4' />
            <path d='M3 5v14a2 2 0 0 0 2 2h16v-5' />
            <path d='M18 12a2 2 0 0 0 0 4h4v-4Z' />
        </Icon>
    );
}

export function DnaIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M2 15c6.667-6 13.333 0 20-6' />
            <path d='M9 22c1.798-1.998 2.518-3.995 2.807-5.993' />
            <path d='M15 2c-1.798 1.998-2.518 3.995-2.807 5.993' />
            <path d='m17 6-2.5-2.5' />
            <path d='m14 8-1-1' />
            <path d='m7 18 2.5 2.5' />
            <path d='m3.5 14.5.5.5' />
            <path d='m20 9 .5.5' />
            <path d='m6.5 12.5 1 1' />
            <path d='m16.5 10.5 1 1' />
            <path d='m10 16 1.5 1.5' />
        </Icon>
    );
}

export function NetworkIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx='12' cy='5' r='3' />
            <path d='M12 8v4' />
            <circle cx='5' cy='19' r='3' />
            <path d='M5 16v-2a4 4 0 0 1 4-4h2' />
            <circle cx='19' cy='19' r='3' />
            <path d='M19 16v-2a4 4 0 0 0-4-4h-2' />
        </Icon>
    );
}

export function FileTextIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
            <polyline points='14 2 14 8 20 8' />
            <line x1='16' y1='13' x2='8' y2='13' />
            <line x1='16' y1='17' x2='8' y2='17' />
            <polyline points='10 9 9 9 8 9' />
        </Icon>
    );
}

export function ScaleIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z' />
            <path d='M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z' />
            <path d='M7 21h10' />
            <path d='M12 3v18' />
            <path d='M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2' />
        </Icon>
    );
}

export function CloudIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z' />
        </Icon>
    );
}

export function UsersIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
            <circle cx='9' cy='7' r='4' />
            <path d='M22 21v-2a4 4 0 0 0-3-3.87' />
            <path d='M16 3.13a4 4 0 0 1 0 7.75' />
        </Icon>
    );
}

export function ArchiveIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <rect x='2' y='4' width='20' height='5' rx='2' />
            <path d='M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9' />
            <path d='M10 13h4' />
        </Icon>
    );
}

// ─── Status / Action Icons ───

export function MessageCircleIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z' />
        </Icon>
    );
}

export function CheckCircleIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx='12' cy='12' r='10' />
            <path d='m9 12 2 2 4-4' />
        </Icon>
    );
}

export function XCircleIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx='12' cy='12' r='10' />
            <path d='m15 9-6 6' />
            <path d='m9 9 6 6' />
        </Icon>
    );
}

export function AlertCircleIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx='12' cy='12' r='10' />
            <line x1='12' y1='8' x2='12' y2='12' />
            <line x1='12' y1='16' x2='12.01' y2='16' />
        </Icon>
    );
}

export function ZapIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2' />
        </Icon>
    );
}

export function RocketIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z' />
            <path d='m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z' />
            <path d='M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0' />
            <path d='M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' />
        </Icon>
    );
}

export function TrophyIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M6 9H4.5a2.5 2.5 0 0 1 0-5H6' />
            <path d='M18 9h1.5a2.5 2.5 0 0 0 0-5H18' />
            <path d='M4 22h16' />
            <path d='M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22' />
            <path d='M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22' />
            <path d='M18 2H6v7a6 6 0 0 0 12 0V2Z' />
        </Icon>
    );
}

export function GearIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' />
            <circle cx='12' cy='12' r='3' />
        </Icon>
    );
}

export function HeartPulseIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' />
            <path d='M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27' />
        </Icon>
    );
}

export function BellIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' />
            <path d='M10.3 21a1.94 1.94 0 0 0 3.4 0' />
        </Icon>
    );
}

export function TimerIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <line x1='10' y1='2' x2='14' y2='2' />
            <line x1='12' y1='14' x2='12' y2='8' />
            <circle cx='12' cy='14' r='8' />
        </Icon>
    );
}

export function BotIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <rect x='3' y='11' width='18' height='10' rx='2' />
            <circle cx='12' cy='5' r='2' />
            <path d='M12 7v4' />
            <line x1='8' y1='16' x2='8' y2='16' />
            <line x1='16' y1='16' x2='16' y2='16' />
        </Icon>
    );
}

export function FlameIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z' />
        </Icon>
    );
}

export function DoveIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M12 22c-4.97 0-9-2.582-9-7v-.088C3 12.794 4.338 11.1 6.375 10c1.949-1.052 3.101-2.99 2.813-5l2.532 1.988c.58.457 1.166.864 1.695 1.202A7.18 7.18 0 0 0 17 9c1.063 0 2.14-.263 3-.729a9.118 9.118 0 0 0 1 2.457c-2.78 2.227-2.78 5.544 0 7.272A9 9 0 0 1 12 22z' />
            <path d='M20 2s0 4-3 6c-3.14 2.092-5.66 1.386-8 0l-3 2' />
        </Icon>
    );
}

export function MicIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z' />
            <path d='M19 10v2a7 7 0 0 1-14 0v-2' />
            <line x1='12' y1='19' x2='12' y2='22' />
        </Icon>
    );
}

export function ClipboardListIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <rect x='8' y='2' width='8' height='4' rx='1' ry='1' />
            <path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' />
            <path d='M12 11h4' />
            <path d='M12 16h4' />
            <path d='M8 11h.01' />
            <path d='M8 16h.01' />
        </Icon>
    );
}

export function ChartBarIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <line x1='12' y1='20' x2='12' y2='10' />
            <line x1='18' y1='20' x2='18' y2='4' />
            <line x1='6' y1='20' x2='6' y2='16' />
        </Icon>
    );
}

export function ActivityIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <polyline points='22 12 18 12 15 21 9 3 6 12 2 12' />
        </Icon>
    );
}

export function StethoscopeIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3' />
            <path d='M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4' />
            <circle cx='20' cy='10' r='2' />
        </Icon>
    );
}

export function PlayIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <polygon points='5 3 19 12 5 21 5 3' />
        </Icon>
    );
}

export function SendIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='m22 2-7 20-4-9-9-4Z' />
            <path d='M22 2 11 13' />
        </Icon>
    );
}

export function RefreshIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' />
            <path d='M21 3v5h-5' />
            <path d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' />
            <path d='M8 16H3v5' />
        </Icon>
    );
}

export function HourglassIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M5 22h14' />
            <path d='M5 2h14' />
            <path d='M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22' />
            <path d='M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2' />
        </Icon>
    );
}

export function VolumeOffIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5' />
            <line x1='22' y1='9' x2='16' y2='15' />
            <line x1='16' y1='9' x2='22' y2='15' />
        </Icon>
    );
}

export function LinkIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' />
            <path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' />
        </Icon>
    );
}

export function CheckIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M20 6 9 17l-5-5' />
        </Icon>
    );
}

export function MenuIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <line x1='3' y1='12' x2='21' y2='12' />
            <line x1='3' y1='6' x2='21' y2='6' />
            <line x1='3' y1='18' x2='21' y2='18' />
        </Icon>
    );
}

export function XIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <line x1='18' y1='6' x2='6' y2='18' />
            <line x1='6' y1='6' x2='18' y2='18' />
        </Icon>
    );
}

export function ChevronDownIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='m6 9 6 6 6-6' />
        </Icon>
    );
}

// ─── Additional Icons ───

export function VoteIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M9 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5' />
            <path d='M3 15v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z' />
            <path d='M14 10h.01' />
            <path d='M18 10h.01' />
            <path d='M14 6h.01' />
            <path d='M18 6h.01' />
        </Icon>
    );
}

export function LoaderIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M12 2v4' />
            <path d='m16.2 7.8 2.9-2.9' />
            <path d='M18 12h4' />
            <path d='m16.2 16.2 2.9 2.9' />
            <path d='M12 18v4' />
            <path d='m4.9 19.1 2.9-2.9' />
            <path d='M2 12h4' />
            <path d='m4.9 4.9 2.9 2.9' />
        </Icon>
    );
}

export function BanIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx='12' cy='12' r='10' />
            <path d='m4.9 4.9 14.2 14.2' />
        </Icon>
    );
}

export function SettingsIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' />
            <circle cx='12' cy='12' r='3' />
        </Icon>
    );
}

export function FolderIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z' />
        </Icon>
    );
}

export function DownloadIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
            <polyline points='7 10 12 15 17 10' />
            <line x1='12' y1='15' x2='12' y2='3' />
        </Icon>
    );
}

export function ChevronRightIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='m9 18 6-6-6-6' />
        </Icon>
    );
}

export function MailIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <rect x='2' y='4' width='20' height='16' rx='2' />
            <path d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' />
        </Icon>
    );
}

export function XTwitterIcon({ size = 16, className = '', ...props }: IconProps) {
    return (
        <svg width={size} height={size} viewBox='0 0 24 24' fill='currentColor' className={className} {...props}>
            <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
        </svg>
    );
}

export function NewspaperIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d='M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2' />
            <path d='M18 14h-8' />
            <path d='M15 18h-5' />
            <path d='M10 6h8v4h-8V6Z' />
        </Icon>
    );
}
