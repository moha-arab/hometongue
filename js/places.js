// Every country and region Guess Me can name, across all eight languages.
// api/languages.js decides which codes a given language is allowed to return;
// this is where the front end looks up what to display and where to fly the map.
//
// Kept separate from dialects.js because that file is the Arabic marker engine —
// this one is language-neutral reference data.

(function () {
const COUNTRIES = {
  // Arabic
  eg: { en: 'Egyptian', ar: 'مصري', region: 'egyptian', lat: 26.9, lng: 30.9, zoom: 6 },
  sd: { en: 'Sudanese', ar: 'سوداني', region: 'sudanese', lat: 15.6, lng: 32.5, zoom: 6 },
  sy: { en: 'Syrian', ar: 'سوري', region: 'levantine', lat: 35.0, lng: 38.3, zoom: 6.5 },
  lb: { en: 'Lebanese', ar: 'لبناني', region: 'levantine', lat: 33.9, lng: 35.9, zoom: 8 },
  jo: { en: 'Jordanian', ar: 'أردني', region: 'levantine', lat: 31.4, lng: 36.6, zoom: 7 },
  ps: { en: 'Palestinian', ar: 'فلسطيني', region: 'levantine', lat: 31.9, lng: 35.2, zoom: 8 },
  iq: { en: 'Iraqi', ar: 'عراقي', region: 'iraqi', lat: 33.2, lng: 43.7, zoom: 6 },
  sa: { en: 'Saudi', ar: 'سعودي', region: 'gulf', lat: 24.0, lng: 44.5, zoom: 5.5 },
  kw: { en: 'Kuwaiti', ar: 'كويتي', region: 'gulf', lat: 29.3, lng: 47.6, zoom: 8 },
  ae: { en: 'Emirati', ar: 'إماراتي', region: 'gulf', lat: 24.3, lng: 54.4, zoom: 7 },
  ye: { en: 'Yemeni', ar: 'يمني', region: 'yemeni', lat: 15.6, lng: 47.9, zoom: 6 },
  ly: { en: 'Libyan', ar: 'ليبي', region: 'maghrebi', lat: 27.1, lng: 17.2, zoom: 5.5 },
  tn: { en: 'Tunisian', ar: 'تونسي', region: 'maghrebi', lat: 34.1, lng: 9.6, zoom: 7 },
  dz: { en: 'Algerian', ar: 'جزائري', region: 'maghrebi', lat: 28.2, lng: 2.6, zoom: 5.5 },
  ma: { en: 'Moroccan', ar: 'مغربي', region: 'maghrebi', lat: 31.8, lng: -6.5, zoom: 6 },

  // Spanish
  es: { en: 'Spain', lat: 40.2, lng: -3.7, zoom: 6 },
  mx: { en: 'Mexico', lat: 23.6, lng: -102.5, zoom: 5 },
  ar: { en: 'Argentina', lat: -38.4, lng: -63.6, zoom: 4 },
  uy: { en: 'Uruguay', lat: -32.5, lng: -55.8, zoom: 6.5 },
  cl: { en: 'Chile', lat: -35.7, lng: -71.5, zoom: 4 },
  co: { en: 'Colombia', lat: 4.6, lng: -74.3, zoom: 5.5 },
  ve: { en: 'Venezuela', lat: 6.4, lng: -66.6, zoom: 5.5 },
  pe: { en: 'Peru', lat: -9.2, lng: -75.0, zoom: 5 },
  bo: { en: 'Bolivia', lat: -16.3, lng: -63.6, zoom: 5.5 },
  ec: { en: 'Ecuador', lat: -1.8, lng: -78.2, zoom: 6.5 },
  py: { en: 'Paraguay', lat: -23.4, lng: -58.4, zoom: 6 },
  cu: { en: 'Cuba', lat: 21.5, lng: -79.5, zoom: 7 },
  do: { en: 'Dominican Republic', lat: 18.7, lng: -70.2, zoom: 8 },
  pr: { en: 'Puerto Rico', lat: 18.2, lng: -66.5, zoom: 9 },
  gt: { en: 'Guatemala', lat: 15.8, lng: -90.2, zoom: 7 },
  cr: { en: 'Costa Rica', lat: 9.7, lng: -83.8, zoom: 8 },

  // French
  fr: { en: 'France', lat: 46.6, lng: 2.2, zoom: 6 },
  ca: { en: 'Canada', lat: 56.1, lng: -96.0, zoom: 3.5 },
  be: { en: 'Belgium', lat: 50.5, lng: 4.5, zoom: 8 },
  ch: { en: 'Switzerland', lat: 46.8, lng: 8.2, zoom: 8 },
  sn: { en: 'Senegal', lat: 14.5, lng: -14.5, zoom: 7 },
  ci: { en: "Côte d'Ivoire", lat: 7.5, lng: -5.5, zoom: 7 },
  cd: { en: 'DR Congo', lat: -4.0, lng: 21.8, zoom: 5 },
  cm: { en: 'Cameroon', lat: 7.4, lng: 12.4, zoom: 6 },
  ht: { en: 'Haiti', lat: 19.0, lng: -72.3, zoom: 8 },

  // Portuguese
  br: { en: 'Brazil', lat: -14.2, lng: -51.9, zoom: 4 },
  pt: { en: 'Portugal', lat: 39.4, lng: -8.2, zoom: 6.5 },
  ao: { en: 'Angola', lat: -11.2, lng: 17.9, zoom: 5.5 },
  mz: { en: 'Mozambique', lat: -18.7, lng: 35.5, zoom: 5 },
  cv: { en: 'Cape Verde', lat: 16.0, lng: -24.0, zoom: 8 },
  gw: { en: 'Guinea-Bissau', lat: 11.8, lng: -15.2, zoom: 8 },
  st: { en: 'São Tomé and Príncipe', lat: 0.2, lng: 6.6, zoom: 9 },
  tl: { en: 'Timor-Leste', lat: -8.9, lng: 125.7, zoom: 8 },

  // Russian
  ru: { en: 'Russia', lat: 61.5, lng: 90.0, zoom: 3 },
  ua: { en: 'Ukraine', lat: 48.4, lng: 31.2, zoom: 6 },
  by: { en: 'Belarus', lat: 53.7, lng: 27.9, zoom: 6.5 },
  kz: { en: 'Kazakhstan', lat: 48.0, lng: 66.9, zoom: 4.5 },
  kg: { en: 'Kyrgyzstan', lat: 41.2, lng: 74.8, zoom: 6.5 },
  uz: { en: 'Uzbekistan', lat: 41.4, lng: 64.6, zoom: 5.5 },
  ge: { en: 'Georgia', lat: 42.3, lng: 43.4, zoom: 7.5 },
  am: { en: 'Armenia', lat: 40.1, lng: 45.0, zoom: 8 },
  md: { en: 'Moldova', lat: 47.4, lng: 28.4, zoom: 7.5 },
  lv: { en: 'Latvia', lat: 56.9, lng: 24.6, zoom: 7.5 },
  ee: { en: 'Estonia', lat: 58.6, lng: 25.0, zoom: 7.5 },
  il: { en: 'Israel', lat: 31.5, lng: 34.9, zoom: 8 },

  // Hindi–Urdu
  in: { en: 'India', lat: 21.0, lng: 78.0, zoom: 4.5 },
  pk: { en: 'Pakistan', lat: 30.4, lng: 69.3, zoom: 5 },

  // Chinese
  cn: { en: 'Mainland China', lat: 35.9, lng: 104.2, zoom: 4 },
  tw: { en: 'Taiwan', lat: 23.7, lng: 121.0, zoom: 7.5 },
  hk: { en: 'Hong Kong', lat: 22.3, lng: 114.2, zoom: 10 },
  sg: { en: 'Singapore', lat: 1.35, lng: 103.8, zoom: 10.5 },
  my: { en: 'Malaysia', lat: 4.2, lng: 108.0, zoom: 6 },

  // English
  us: { en: 'United States', lat: 39.8, lng: -98.6, zoom: 3.5 },
  gb: { en: 'United Kingdom', lat: 54.5, lng: -3.4, zoom: 5.5 },
  ie: { en: 'Ireland', lat: 53.4, lng: -8.2, zoom: 7 },
  au: { en: 'Australia', lat: -25.3, lng: 133.8, zoom: 4 },
  nz: { en: 'New Zealand', lat: -41.0, lng: 174.9, zoom: 5.5 },
  za: { en: 'South Africa', lat: -30.6, lng: 22.9, zoom: 5 },
  ng: { en: 'Nigeria', lat: 9.1, lng: 8.7, zoom: 6 },
  gh: { en: 'Ghana', lat: 7.9, lng: -1.0, zoom: 7 },
  ke: { en: 'Kenya', lat: 0.0, lng: 37.9, zoom: 6 },
  na: { en: 'Namibia', lat: -22.6, lng: 17.1, zoom: 5.5 },
  jm: { en: 'Jamaica', lat: 18.1, lng: -77.3, zoom: 9 },
  tt: { en: 'Trinidad and Tobago', lat: 10.7, lng: -61.2, zoom: 9 },
};

const REGIONS = {
  // Arabic
  egyptian: { en: 'Egyptian', ar: 'مصرية' },
  levantine: { en: 'Levantine', ar: 'شامية' },
  iraqi: { en: 'Iraqi', ar: 'عراقية' },
  gulf: { en: 'Gulf', ar: 'خليجية' },
  yemeni: { en: 'Yemeni', ar: 'يمنية' },
  sudanese: { en: 'Sudanese', ar: 'سودانية' },
  maghrebi: { en: 'Maghrebi', ar: 'مغاربية' },
  // Spanish
  peninsular: { en: 'Peninsular' },
  rioplatense: { en: 'Rioplatense' },
  mexican: { en: 'Mexican' },
  andean: { en: 'Andean' },
  caribbean: { en: 'Caribbean' },
  chilean: { en: 'Chilean' },
  centralamerican: { en: 'Central American' },
  // French
  metropolitan: { en: 'Metropolitan French' },
  quebecois: { en: 'Québécois' },
  belgian: { en: 'Belgian' },
  swiss: { en: 'Swiss' },
  westafrican: { en: 'West African' },
  eastafrican: { en: 'East African' },
  // Portuguese
  brazilian: { en: 'Brazilian' },
  european: { en: 'European Portuguese' },
  angolan: { en: 'Angolan' },
  mozambican: { en: 'Mozambican' },
  capeverdean: { en: 'Cape Verdean' },
  // Russian
  central: { en: 'Central Russian' },
  northwest: { en: 'Northwestern (Petersburg)' },
  southern: { en: 'Southern Russian' },
  siberian: { en: 'Siberian' },
  ukrainian: { en: 'Ukrainian Russian' },
  belarusian: { en: 'Belarusian' },
  centralasian: { en: 'Central Asian' },
  caucasus: { en: 'Caucasus' },
  diaspora: { en: 'Diaspora' },
  // Hindi–Urdu
  hindi: { en: 'Hindi register' },
  urdu: { en: 'Urdu register' },
  bambaiya: { en: 'Bambaiya (Mumbai)' },
  punjabi: { en: 'Punjabi-influenced' },
  hyderabadi: { en: 'Hyderabadi' },
  dakhini: { en: 'Dakhini' },
  // Chinese
  mainland: { en: 'Mainland Mandarin' },
  taiwan: { en: 'Taiwan Mandarin' },
  cantonese: { en: 'Cantonese' },
  singapore: { en: 'Singapore' },
  northern: { en: 'Northern' },
  // English
  american: { en: 'American' },
  canadian: { en: 'Canadian' },
  english: { en: 'English (England)' },
  scottish: { en: 'Scottish' },
  welsh: { en: 'Welsh' },
  irish: { en: 'Irish' },
  australasian: { en: 'Australian / NZ' },
  southafrican: { en: 'South African' },
  southasian: { en: 'South Asian' },
  seasian: { en: 'Southeast Asian' },
  // shared
  msa: { en: 'Standard' },
  neutral: { en: 'Neutral' },
};

window.HT_PLACES = { COUNTRIES, REGIONS };
}());
