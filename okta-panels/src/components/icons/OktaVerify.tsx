import React from 'react';

export function OktaVerifyIcon({ title = 'Okta', className }: { title?: string; className?: string }) {
  return (
    <svg role="img" aria-label={title} className={className} viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <title>{title}</title>
      <g transform="translate(0,240) scale(0.1,-0.1)" fill="#012a7e" stroke="none">
        <path d="M1053 2086 c-308 -59 -549 -245 -674 -521 -100 -221 -99 -509 2 -733
 87 -194 257 -364 454 -453 221 -100 509 -99 733 2 194 87 364 257 453 454 98
 217 99 506 2 725 l-24 54 -174 -174 -175 -175 0 -52 c0 -285 -249 -502 -521
 -455 -246 42 -412 273 -371 513 42 246 273 412 513 371 79 -14 190 -66 232
 -110 l27 -28 -165 -164 -164 -164 -89 87 c-93 90 -118 102 -157 73 -11 -8 -18
 -26 -18 -45 0 -28 16 -49 116 -148 98 -99 120 -116 147 -116 28 0 69 37 380
 348 l349 349 -19 26 c-67 94 -219 214 -345 271 -144 65 -364 93 -512 65z"/>
      </g>
    </svg>
  );
}
