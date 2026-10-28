// Instant, zero-network class portraits for character selection.
// These are decorative illustrations, not loaded 3D game models.
const presets={
  1:['#975234','#3d2924','axe'],2:['#718b8d','#293e4a','hammer'],
  3:['#5a9d76','#283b33','bow'],4:['#637fa6','#243348','spear'],
  5:['#b98a53','#483326','spear'],6:['#d6b57b','#344866','sword'],
  7:['#668cc0','#273e6b','staff'],8:['#d6b4dd','#765184','staff'],
  9:['#7a879e','#303447','daggers'],10:['#8173ba','#312b51','staff'],
  11:['#d9a56a','#51382b','fists'],
};
function weapon(type){
 switch(type){
  case 'sword':return '<path d="M219 93l9-47 8 47-8 66z" fill="#c6dce9" stroke="#e5c687" stroke-width="4"/><path d="M204 158h47m-23 0v42" stroke="#e5c687" stroke-width="9"/>';
  case 'axe':return '<path d="M226 67v149" stroke="#e3c190" stroke-width="10"/><path d="M223 65q-61-24-58 31 28-18 58 16z" fill="#b8c9d2" stroke="#e3c190" stroke-width="5"/>';
  case 'hammer':return '<path d="M227 88v130" stroke="#d5b57e" stroke-width="10"/><path d="M183 80h86v46h-86z" fill="#a1b5c2" stroke="#e5c687" stroke-width="6"/>';
  case 'bow':return '<path d="M228 53q-90 91 0 177" fill="none" stroke="#e2bc7d" stroke-width="11"/><path d="M228 53v177" stroke="#e7e0ce" stroke-width="2"/>';
  case 'spear':return '<path d="M228 58v182" stroke="#d3b47b" stroke-width="8"/><path d="M228 25l-17 43 17 27 17-27z" fill="#aed9e7" stroke="#e1bd7d" stroke-width="4"/>';
  case 'staff':return '<path d="M226 87v159" stroke="#bd9b71" stroke-width="9"/><path d="M226 55l-21 27 21 36 21-36z" fill="#60d1f1" stroke="#e6c487" stroke-width="5"/><path d="M206 89q-24-40 20-52 44 12 20 52" fill="none" stroke="#d9bf96" stroke-width="5"/>';
  case 'daggers':return '<path d="M63 164L45 85l37 61m-4 13l-20 37M215 164l18-79-37 61m4 13l20 37" fill="#c4d7df" stroke="#e7c387" stroke-width="5"/>';
  default:return '<path d="M58 173l-14-34 21 8 8 24m140 2l14-34-21 8-8 24" fill="#c3d3da" stroke="#e0b778" stroke-width="5"/>';
 }
}
export function characterPortrait(job,{mini=false}={}){
 const n=Number(job),[primary,dark,item]=presets[n]??presets[6];
 const rank=n===3||n===5||n===9?1:n===7||n===8||n===10?2:0;
 const cape=rank===2?'#384166':rank===1?'#355044':'#4f3331';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 340" role="img" aria-label="Ilustração da classe ${n}" preserveAspectRatio="xMidYMid meet">
 <defs><radialGradient id="a"><stop stop-color="${primary}" stop-opacity=".3"/><stop offset="1" stop-color="${primary}" stop-opacity="0"/></radialGradient><linearGradient id="armor" x2="1" y2="1"><stop stop-color="${primary}"/><stop offset=".52" stop-color="${dark}"/><stop offset="1" stop-color="${primary}"/></linearGradient></defs>
 <ellipse cx="140" cy="177" rx="125" ry="157" fill="url(#a)"/>
 <path d="M109 145Q64 171 44 305H234Q208 171 174 145" fill="${cape}" stroke="#b39b6d" stroke-width="3"/>
 <path d="M108 246l-24 76h42l16-73 16 73h42l-23-76" fill="${dark}" stroke="#bd9e70" stroke-width="5"/>
 <path d="M107 153l-39 18-21 94 36 13 30-68m58-57 39 18 21 94-36 13-30-68" fill="url(#armor)" stroke="#dab879" stroke-width="5"/>
 <path d="M105 144l70 0 25 75-60 39-60-39z" fill="url(#armor)" stroke="#e2c082" stroke-width="5"/>
 <path d="M140 153l-20 49 20 36 20-36z" fill="${primary}" stroke="#e6d09c" stroke-width="4"/>
 <circle cx="140" cy="199" r="13" fill="#3cabc3" stroke="#eac97f" stroke-width="5"/>
 <path d="M121 133v23q19 22 38 0v-23" fill="#b98a68"/>
 <ellipse cx="140" cy="107" rx="32" ry="40" fill="#c69c7a" stroke="#604835" stroke-width="3"/>
 <path d="M105 108Q93 45 142 51q47-3 35 57L164 81l-26-5-22 8z" fill="${dark}" stroke="#b18d56" stroke-width="5"/>
 <path d="M116 107h14m21 0h14" stroke="#293037" stroke-width="5" stroke-linecap="round"/>
 <path d="M132 126q8 5 16 0" fill="none" stroke="#734c3d" stroke-width="3"/>
 <path d="M89 168l-27-9 7 39 24 6m98-36 27-9-7 39-24 6" fill="${primary}" stroke="#dfb879" stroke-width="5"/>
 <g opacity=".97">${weapon(item)}</g>
 <path d="M93 234q47 14 94 0" fill="none" stroke="#e4c484" stroke-width="7"/>
 <ellipse cx="140" cy="324" rx="75" ry="7" fill="#000" opacity=".35"/>
 </svg>`;
 const element=document.createElement('span');
 element.className=mini?'character-art character-art-mini':'character-art character-art-main';
 element.innerHTML=svg;
 return element;
}
