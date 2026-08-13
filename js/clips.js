// Pin It clip manifest.
// DECK RULE: a dialect deck only contains speakers from places where that language is native
// or a main/official language (Nigeria/South Africa/India/Jamaica belong in English; a Filipino
// reading an English script, or a Latvian speaking Russian, do not). Enforced by tools/check-decks.mjs.
// Clips are mirrored locally as mono mp3s, trimmed + re-encoded, each credited in the reveal sheet.
// start = fixed playback offset, used when the opening seconds name the answer. wild = spontaneous speech.
window.CLIPS = {
  "languages": [
    {
      "id": "lang-uzbek",
      "label": "Uzbek",
      "lang": "Uzbek",
      "url": "/clips/languages/lang-uzbek.mp3",
      "lat": 41.3,
      "lng": 64.5,
      "r": 600,
      "size": 1246816,
      "hint": "A spoken Uzbek Wikipedia article about the Jadids, Central Asia's early-1900s reform movement (~156s).",
      "source": {
        "who": "Panpanchik",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Jadidlar.ogg",
        "note": ""
      },
      "lufs": -16.5
    },
    {
      "id": "lang-turkish",
      "label": "Turkish",
      "lang": "Turkish",
      "url": "/clips/languages/lang-turkish.mp3",
      "lat": 39.5,
      "lng": 34.5,
      "r": 700,
      "size": 1920775,
      "hint": "A Turkish spoken-Wikipedia reading about the UN Security Council (~6.5 min).",
      "source": {
        "who": "narrated by Elmacenderesi (Turkish Spoken Wikipedia",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 2.5",
        "page": "https://commons.wikimedia.org/wiki/File:Birle%C5%9Fmi%C5%9F_Milletler_G%C3%BCvenlik_Konseyi.ogg",
        "note": ""
      },
      "lufs": -16.5
    },
    {
      "id": "lang-persian-farsi",
      "label": "Persian (Farsi)",
      "lang": "Persian",
      "url": "/clips/languages/lang-persian-farsi.mp3",
      "start": 0, "lat": 32.5,
      "lng": 53.7,
      "r": 1500,
      "size": 1920775,
      "hint": "A Persian Wikipedia reading of the article on Nowruz, the Persian New Year (~30 min).",
      "alt": [
        {
          "name": "Kabul, Afghanistan (Dari)",
          "lat": 34.5553,
          "lng": 69.2075
        },
        {
          "name": "Dushanbe, Tajikistan (Tajik)",
          "lat": 38.5598,
          "lng": 68.787
        }
      ],
      "source": {
        "who": "Mehdi at Persian Wikipedia and fa.wikipedia contributors",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Nowruz-fa.ogg",
        "note": ""
      },
      "lufs": -16.2
    },
    {
      "id": "lang-hindi",
      "label": "Hindi",
      "lang": "Hindi",
      "url": "/clips/languages/lang-hindi.mp3",
      "lat": 26.8,
      "lng": 80.9,
      "r": 800,
      "size": 1920775,
      "hint": "A Hindi Wikipedia reading about the Indo-European language family (~15.5 min).",
      "alt": [
        {
          "name": "Delhi, India",
          "lat": 28.6139,
          "lng": 77.209
        }
      ],
      "source": {
        "who": "Magicalsaumy at hi.wikipedia",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Hi-Hind-Europiya_bhaashaa_parivaar_part1.ogg",
        "note": ""
      },
      "lufs": -16.8
    },
    {
      "id": "lang-bengali",
      "label": "Bengali",
      "lang": "Bengali",
      "url": "/clips/languages/lang-bengali.mp3",
      "lat": 23.5,
      "lng": 89,
      "r": 400,
      "size": 567005,
      "hint": "A Bengali explanation of dengue fever symptoms, recorded at a 2012 Spoken Wikipedia workshop (~71s).",
      "alt": [
        {
          "name": "Dhaka, Bangladesh",
          "lat": 23.8103,
          "lng": 90.4125
        }
      ],
      "source": {
        "who": "Priyanka Nag",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Dengue_Bengali_symptoms.ogg",
        "note": ""
      },
      "lufs": -16.5
    },
    {
      "id": "lang-thai",
      "label": "Thai",
      "lang": "Thai",
      "url": "/clips/languages/lang-thai.mp3",
      "start": 0, "lat": 15.5,
      "lng": 101,
      "r": 500,
      "size": 1920775,
      "hint": "A Thai spoken-Wikipedia article about Saman Kunan, the diver from the 2018 Tham Luang cave rescue (~11 min).",
      "source": {
        "who": "speaker B20180 (Thai Spoken Wikipedia",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Th-Saman_Gunan.ogg",
        "note": ""
      },
      "lufs": -16.6
    },
    {
      "id": "lang-vietnamese",
      "label": "Vietnamese",
      "lang": "Vietnamese",
      "url": "/clips/languages/lang-vietnamese.mp3",
      "lat": 16.5,
      "lng": 107.6,
      "r": 700,
      "size": 565988,
      "hint": "A recitation of the Vietnamese poem 'Kiếp Lưu Vong' (Life in Exile) (~71s).",
      "source": {
        "who": "Hoàng Kỳ bay (read by Nguyễn Viết Dũng",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:B%C3%A0i_th%C6%A1_Ki%E1%BA%BFp_L%C6%B0u_Vong.wav",
        "note": ""
      },
      "lufs": -18
    },
    {
      "id": "lang-japanese",
      "label": "Japanese",
      "lang": "Japanese",
      "url": "/clips/languages/lang-japanese.mp3",
      "lat": 36,
      "lng": 138,
      "r": 700,
      "size": 787270,
      "hint": "This is the opening of Natsume Soseki's beloved 1906 novel Botchan, read aloud.",
      "source": {
        "who": "read by marsian",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:Ja-botchan_1-1_1-2.ogg",
        "note": ""
      },
      "lufs": -16.7
    },
    {
      "id": "lang-korean",
      "label": "Korean",
      "lang": "Korean",
      "url": "/clips/languages/lang-korean.mp3",
      "lat": 36.5,
      "lng": 127.8,
      "r": 500,
      "size": 1920775,
      "hint": "A LibriVox reading of \"Piano\", a 1920s short story by colonial-era writer Hyun Jin-geon.",
      "alt": [
        {
          "name": "Pyongyang, North Korea",
          "lat": 39.0392,
          "lng": 125.7625
        }
      ],
      "source": {
        "who": "read by Jessie Yun for LibriVox",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:LibriVox_-_%ED%98%84%EC%A7%84%EA%B1%B4_%ED%94%BC%EC%95%84%EB%85%B8.ogg",
        "note": ""
      },
      "lufs": -16.9
    },
    {"start": 72, 
      "id": "lang-mandarin-chinese",
      "label": "Mandarin Chinese",
      "lang": "Mandarin Chinese",
      "url": "/clips/languages/lang-mandarin-chinese.mp3",
      "lat": 35,
      "lng": 110,
      "r": 1500,
      "size": 1920775,
      "hint": "A spoken Wikipedia recording of the article about the People's Republic of China.",
      "alt": [
        {
          "name": "Taipei, Taiwan",
          "lat": 25.033,
          "lng": 121.5654
        },
        {
          "name": "Singapore",
          "lat": 1.3521,
          "lng": 103.8198
        }
      ],
      "source": {
        "who": "spoken by Blueberry Yogurt",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Zh-PRC-Part1.ogg",
        "note": ""
      },
      "lufs": -17
    },
    {
      "id": "lang-indonesian",
      "label": "Indonesian",
      "lang": "Indonesian",
      "url": "/clips/languages/lang-indonesian.mp3",
      "start": 90, "lat": -4,
      "lng": 112,
      "r": 1500,
      "size": 1920775,
      "hint": "A spoken Indonesian Wikipedia article about Kartinah, recorded by a volunteer narrator.",
      "source": {
        "who": "by Akhsinatun Aisyah",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Akhsinatun_Aisyah_kartinah.ogg",
        "note": ""
      },
      "lufs": -15.5
    },
    {
      "id": "lang-tagalog",
      "label": "Tagalog",
      "lang": "Tagalog",
      "url": "/clips/languages/lang-tagalog.mp3",
      "lat": 14.6,
      "lng": 121,
      "r": 400,
      "size": 1262071,
      "hint": "A Tagalog Wikipedia health article about hepatitis C, read aloud for the Spoken Wikipedia project.",
      "source": {
        "who": "spoken by Sky Harbor",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Hep_C_tl.ogg",
        "note": ""
      },
      "lufs": -16.4
    },
    {
      "id": "lang-swahili",
      "label": "Swahili",
      "lang": "Swahili",
      "url": "/clips/languages/lang-swahili.mp3",
      "start": 30, "lat": -6.2,
      "lng": 39,
      "r": 1200,
      "size": 1920989,
      "hint": "A VOA Swahili radio feature about diseases that had major impact on Africa.",
      "alt": [
        {
          "name": "Dar es Salaam, Tanzania",
          "lat": -6.7924,
          "lng": 39.2083
        },
        {
          "name": "Nairobi, Kenya",
          "lat": -1.2864,
          "lng": 36.8172
        }
      ],
      "source": {
        "who": "Voice of America Swahili Service (voaswahili.com",
        "host": "Voice of America",
        "license": "US government work (public domain)",
        "page": "",
        "note": ""
      },
      "lufs": -16.7
    },
    {
      "id": "lang-amharic",
      "label": "Amharic",
      "lang": "Amharic",
      "url": "/clips/languages/lang-amharic.mp3",
      "start": 0, "lat": 9.03,
      "lng": 38.74,
      "r": 600,
      "size": 1920821,
      "hint": "An interview with a poet of Qene, Ethiopia's tradition of improvised double-meaning poetry.",
      "source": {
        "who": "Goethe-Institut Addis Ababa (qeneonnet.org",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Chegode_Meri_Biruh_1.wav",
        "note": ""
      },
      "lufs": -16.1
    },
    {
      "id": "lang-somali",
      "label": "Somali",
      "lang": "Somali",
      "url": "/clips/languages/lang-somali.mp3",
      "lat": 5,
      "lng": 46,
      "r": 800,
      "size": 496370,
      "hint": "Sheikh Ahmed Nur giving a speech in Standard Somali, broadcast on Somali TV in 2012.",
      "alt": [
        {
          "name": "Hargeisa, Somaliland",
          "lat": 9.56,
          "lng": 44.065
        },
        {
          "name": "Djibouti City, Djibouti",
          "lat": 11.5721,
          "lng": 43.1456
        }
      ],
      "source": {
        "who": "SOMTV",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Shaxmednuradc1.ogg",
        "note": ""
      },
      "lufs": -16.8
    },
    {"start": 0, 
      "id": "lang-hausa",
      "label": "Hausa",
      "lang": "Hausa",
      "url": "/clips/languages/lang-hausa.mp3",
      "lat": 12,
      "lng": 8.5,
      "r": 800,
      "size": 1920775,
      "hint": "A Hausa Wikipedia article read aloud by a native speaker; Hausa is West Africa's biggest trade language.",
      "alt": [
        {
          "name": "Niamey, Niger",
          "lat": 13.5116,
          "lng": 2.1254
        }
      ],
      "source": {
        "who": "spoken by DaSupremo (Hausa Wikipedia",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Yan_Ghana_A_Jamus.ogg",
        "note": ""
      },
      "lufs": -16.3
    },
    {
      "id": "lang-russian",
      "label": "Russian",
      "lang": "Russian",
      "url": "/clips/languages/lang-russian.mp3",
      "lat": 55.75,
      "lng": 37.62,
      "r": 1500,
      "size": 1871038,
      "hint": "The article being read is the Russian Wikipedia page about the video game Apex Legends.",
      "alt": [
        {
          "name": "Minsk, Belarus",
          "lat": 53.9006,
          "lng": 27.559
        },
        {
          "name": "Almaty, Kazakhstan",
          "lat": 43.222,
          "lng": 76.8512
        },
        {
          "name": "Bishkek, Kyrgyzstan",
          "lat": 42.8746,
          "lng": 74.5698
        }
      ],
      "source": {
        "who": "speaker Sergey Nikolaev V",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Ru-Apex_Legends.ogg",
        "note": ""
      },
      "lufs": -16.6
    },
    {
      "id": "lang-ukrainian",
      "label": "Ukrainian",
      "lang": "Ukrainian",
      "url": "/clips/languages/lang-ukrainian.mp3",
      "lat": 49,
      "lng": 31.4,
      "r": 600,
      "size": 898238,
      "hint": "A Ukrainian Wikipedia volunteer reading the article about magnetic bearings.",
      "source": {
        "who": "speaker User:Veeer",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:UA_Magnetic_bearing.ogg",
        "note": ""
      },
      "lufs": -16.6
    },
    {
      "id": "lang-polish",
      "label": "Polish",
      "lang": "Polish",
      "url": "/clips/languages/lang-polish.mp3",
      "lat": 52.06,
      "lng": 19.48,
      "r": 400,
      "size": 1920775,
      "hint": "A Polish reading of the article about Richard Bourke, a 19th-century governor of New South Wales.",
      "source": {
        "who": "Powerek38",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Pl-Richard_Bourke-article.ogg",
        "note": ""
      },
      "lufs": -16.4
    },
    {
      "id": "lang-greek",
      "label": "Greek",
      "lang": "Greek",
      "url": "/clips/languages/lang-greek.mp3",
      "lat": 38.5,
      "lng": 23.5,
      "r": 400,
      "size": 1920775,
      "hint": "The article being read is about chaos theory (Θεωρία του Χάους).",
      "alt": [
        {
          "name": "Nicosia, Cyprus",
          "lat": 35.1856,
          "lng": 33.3823
        }
      ],
      "source": {
        "who": "GPoul",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Ell-article-Theoria_tou_Haous.ogg",
        "note": ""
      },
      "lufs": -16.4
    },
    {
      "id": "lang-german",
      "label": "German",
      "lang": "German",
      "url": "/clips/languages/lang-german.mp3",
      "start": 45, "lat": 50.9,
      "lng": 10,
      "r": 600,
      "size": 1920775,
      "hint": "The article is about the Ahlemer Turm, a historic tower in Hanover.",
      "alt": [
        {
          "name": "Vienna, Austria",
          "lat": 48.2082,
          "lng": 16.3738
        },
        {
          "name": "Zürich, Switzerland",
          "lat": 47.3769,
          "lng": 8.5417
        }
      ],
      "source": {
        "who": "speaker Jonsonr",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:De-Ahlemer_Turm.ogg",
        "note": ""
      },
      "lufs": -16.4
    },
    {
      "id": "lang-french",
      "label": "French",
      "lang": "French",
      "url": "/clips/languages/lang-french.mp3",
      "lat": 48.86,
      "lng": 2.35,
      "r": 1500,
      "size": 1920775,
      "hint": "The article is about the arquebus, an early gunpowder firearm.",
      "alt": [
        {
          "name": "Montréal, Canada",
          "lat": 45.5019,
          "lng": -73.5674
        },
        {
          "name": "Brussels, Belgium",
          "lat": 50.8503,
          "lng": 4.3517
        },
        {
          "name": "Geneva, Switzerland",
          "lat": 46.2044,
          "lng": 6.1432
        },
        {
          "name": "Dakar, Senegal",
          "lat": 14.7167,
          "lng": -17.4677
        },
        {
          "name": "Kinshasa, DR Congo",
          "lat": -4.4419,
          "lng": 15.2663
        },
        {
          "name": "Abidjan, Côte d’Ivoire",
          "lat": 5.36,
          "lng": -4.0083
        }
      ],
      "source": {
        "who": "Michel",
        "host": "Wikimedia Commons",
        "license": "CC BY 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Arquebuse.ogg",
        "note": ""
      },
      "lufs": -16.4
    },
    {"start": 180, 
      "id": "lang-portuguese-brazil",
      "label": "Portuguese (Brazil)",
      "lang": "Portuguese",
      "url": "/clips/languages/lang-portuguese-brazil.mp3",
      "lat": -22.91,
      "lng": -43.2,
      "r": 1500,
      "size": 1920775,
      "hint": "This is explicitly the Rio de Janeiro accent version of the article on Slavs of Asia Minor.",
      "alt": [
        {
          "name": "Lisbon, Portugal",
          "lat": 38.7223,
          "lng": -9.1393
        },
        {
          "name": "Luanda, Angola",
          "lat": -8.839,
          "lng": 13.2894
        },
        {
          "name": "Maputo, Mozambique",
          "lat": -25.9692,
          "lng": 32.5732
        }
      ],
      "source": {
        "who": "Eduardo P",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Eslavos_da_%C3%81sia_Menor_vers%C3%A3o_RJ.ogg",
        "note": ""
      },
      "lufs": -16.4
    },
    {
      "id": "lang-italian",
      "label": "Italian",
      "lang": "Italian",
      "url": "/clips/languages/lang-italian.mp3",
      "start": 75, "lat": 41.9,
      "lng": 12.5,
      "r": 500,
      "size": 1806045,
      "hint": "The article is about Fonni, the highest-altitude town on the island of Sardinia.",
      "alt": [
        {
          "name": "Lugano, Switzerland",
          "lat": 46.0037,
          "lng": 8.9511
        }
      ],
      "source": {
        "who": "IDany97",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Itwiki-Fonni.ogg",
        "note": ""
      },
      "lufs": -16.4
    },
    {"start": 30, 
      "id": "lang-swedish",
      "label": "Swedish",
      "lang": "Swedish",
      "url": "/clips/languages/lang-swedish.mp3",
      "lat": 59.33,
      "lng": 18.07,
      "r": 500,
      "size": 1182868,
      "hint": "The article is about Rödeby, a small town in Blekinge, southern Sweden.",
      "source": {
        "who": "Arrowkiwi",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Sv-R%C3%B6deby-article.ogg",
        "note": ""
      },
      "lufs": -16.5
    },
    {
      "id": "lang-hungarian",
      "label": "Hungarian",
      "lang": "Hungarian",
      "url": "/clips/languages/lang-hungarian.mp3",
      "lat": 47.5,
      "lng": 19.05,
      "r": 400,
      "size": 1920775,
      "hint": "A Hungarian reading of the Wikipedia article about Turkey (Törökország).",
      "source": {
        "who": "Commons contributor Dubaduba (Hungarian spoken Wikipedia)",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:HunArtTorokorszag.ogg",
        "note": ""
      },
      "lufs": -16.1
    }
  ],
  "accents": [
    {"id":"yt-OqIpz_eEaKg","kind":"yt","videoId":"OqIpz_eEaKg","label":"Kingston, Jamaica","lang":"English","lat":17.9714,"lng":-76.7931,"r":60,"start":75,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Kingston, Jamaica","offBy":5,"confidence":88,"evidence":["Jamaican Patois grammar and cadence","Pronunciation of 'furniture', 'car', and 'baby'","Regional vocabulary like 'gully water'"],"title":"Funny Jamaican Interview ,Flooding in Jamaica,Rosie tutty gran","author":"Islandvisuals"},"evalExclude":true,"source":{"who":"Islandvisuals","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=OqIpz_eEaKg","note":"Funny Jamaican Interview ,Flooding in Jamaica,Rosie tutty gran"}},
    {"id":"yt-7lMWf8-Q9jA","kind":"yt","videoId":"7lMWf8-Q9jA","label":"Kingston, Jamaica","lang":"English","lat":17.9714,"lng":-76.7931,"r":60,"start": 61,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Kingston, Jamaica","offBy":0,"confidence":95,"evidence":["Jamaican Patois syntax ('them have')","Distinct Caribbean/Jamaican rhythmic cadence and intonation","Direct mention of York Pharmacy in Kingston"],"title":"Rosie interviewed outside York Pharmacy :Funny Jamaican Interview : Kingston, Jamaica","author":"York Pharmacy"},"evalExclude":true,"source":{"who":"York Pharmacy","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=7lMWf8-Q9jA","note":"Rosie interviewed outside York Pharmacy :Funny Jamaican Interview : Kingston, Jamaica"}},
    {"id":"yt-I4k8dR04TzA","kind":"yt","videoId":"I4k8dR04TzA","label":"Glasgow, Scotland","lang":"English","lat":55.8642,"lng":-4.2518,"r":60,"start":30,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Glasgow, Scotland, United Kingdom","offBy":0,"confidence":85,"evidence":["tapped 'r' in words like 'parliamentary' and 'refurbishment'","Scottish monophthongal vowel sounds in 'quite' and 'estate'","glottal stops for /t/ in 'getting' and 'what'"],"title":"Tory MP fails to understand Glaswegian accent of SNP's David Linden","author":"Guardian News"},"evalExclude":true,"source":{"who":"Guardian News","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=I4k8dR04TzA","note":"Tory MP fails to understand Glaswegian accent of SNP's David Linden"}},
    {"id":"yt-SS9bBuF0w4w","kind":"yt","videoId":"SS9bBuF0w4w","label":"Kingston, Jamaica","lang":"English","lat":17.9714,"lng":-76.7931,"r":60,"start": 403,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Kingston, Jamaica","offBy":0,"confidence":95,"evidence":["distinct Jamaican English prosody and pitch contours","th-stopping ('dis', 'dey')","word order typical of Jamaican Creole influenced English ('Downtown Kingston we are')"],"title":"DOWNTOWN KINGSTON MARKET VYBZ | INTERRACIAL FAMILY VLOG | JAMAICAN LIVING IN FRANCE","author":"The Delaveaus"},"evalExclude":true,"source":{"who":"The Delaveaus","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=SS9bBuF0w4w","note":"DOWNTOWN KINGSTON MARKET VYBZ | INTERRACIAL FAMILY VLOG | JAMAICAN LIVING IN FRANCE"}},
    {"id":"yt-wt24nLiNa8I","kind":"yt","videoId":"wt24nLiNa8I","label":"Kingston, Jamaica","lang":"English","lat":17.9714,"lng":-76.7931,"r":60,"start":166,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Kingston, Jamaica","offBy":4,"confidence":85,"evidence":["Distinctive Jamaican melodic pitch contours and syllable timing","Non-rhotic Caribbean vowels in words like 'early'","Grammatical structures like 'everybody have to'"],"title":"A DAY IN MY LIFE | MARKET TOUR 2021 | PRICE CHECK","author":"JAMAICAN KIM"},"evalExclude":true,"source":{"who":"JAMAICAN KIM","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=wt24nLiNa8I","note":"A DAY IN MY LIFE | MARKET TOUR 2021 | PRICE CHECK"}},
    
    {"id":"yt-tI8FBKscgQ4","kind":"yt","videoId":"tI8FBKscgQ4","label":"Lagos, Nigeria","lang":"English","lat":6.5244,"lng":3.3792,"r":80,"start": 370,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Lagos, Nigeria","offBy":0,"confidence":85,"evidence":["Nigerian West African English phonology","Syllable-timed speech rhythm","Local Nigerian street interview context"],"title":"Nigeria is in what PLANET? | Street Quiz Nigeria (Ep. 18) | Funny African Videos |","author":"RakGhana"},"evalExclude":true,"source":{"who":"RakGhana","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=tI8FBKscgQ4","note":"Nigeria is in what PLANET? | Street Quiz Nigeria (Ep. 18) | Funny African Videos |"}},
    {"id":"yt-LhMvmH_uodE","kind":"yt","videoId":"LhMvmH_uodE","label":"Glasgow, Scotland","lang":"English","lat":55.8642,"lng":-4.2518,"r":60,"start": 330,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Glasgow, Scotland, United Kingdom","offBy":0,"confidence":95,"evidence":["States explicitly 'I'm Glaswegian, aye. I am Glasgow'","Broad Glaswegian vowels and phonology","Use of regional slang 'Weegie' and Scottish affirmative 'aye'"],"title":"When Scottish People Speak English.. | 當蘇格蘭人說英文時...我投降了!!","author":"Torres Pit托哥"},"evalExclude":true,"source":{"who":"Torres Pit托哥","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=LhMvmH_uodE","note":"When Scottish People Speak English.. | 當蘇格蘭人說英文時...我投降了!!"}},
    {"id":"yt-DpnUurJvGWs","kind":"yt","videoId":"DpnUurJvGWs","label":"Glasgow, Scotland","lang":"English","lat":55.8642,"lng":-4.2518,"r":60,"start":48,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Glasgow, Scotland, United Kingdom","offBy":0,"confidence":85,"evidence":["Scottish monophthongal vowels and tapped /r/ sounds","References to Scottish history/culture and local Scottish slang in background","Distinct central belt Scottish intonation and rhythm"],"title":"People Make Glass Gow","author":"Paul Black"},"evalExclude":true,"source":{"who":"Paul Black","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=DpnUurJvGWs","note":"People Make Glass Gow"}},
    {"id":"yt-HylaY5e1awo","kind":"yt","videoId":"HylaY5e1awo","label":"Singapore","lang":"English","lat":1.3521,"lng":103.8198,"r":40,"start":186,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Singapore","offBy":0,"confidence":95,"evidence":["Distinctive Singaporean English (Singlish) intonation and rhythm","Syllable-timed prosody characteristic of Singapore and Malaysia","Speaker explicitly mentions 'Singlish' in the conversation"],"title":"The Singaporean White Boy - The Shan and Rozz Show: EP7","author":"Clicknetwork"},"evalExclude":true,"source":{"who":"Clicknetwork","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=HylaY5e1awo","note":"The Singaporean White Boy - The Shan and Rozz Show: EP7"}},
    {"id":"yt-HpTfmxkXU1A","kind":"yt","videoId":"HpTfmxkXU1A","label":"Singapore","lang":"English","lat":1.3521,"lng":103.8198,"r":40,"start": 161,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Singapore","offBy":0,"confidence":95,"evidence":["Use of local Singlish term 'ang moh' referring to Caucasians","Explicit discussion of local identity in Singapore","Syllable-timed rhythm and prosody typical of Singaporean English"],"title":"What Do People Think Of Singaporeans With \"Angmoh\" Accents? | Word On The Street","author":"TheSmartLocal"},"evalExclude":true,"source":{"who":"TheSmartLocal","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=HpTfmxkXU1A","note":"What Do People Think Of Singaporeans With \"Angmoh\" Accents? | Word On The Street"}},
    
    {
      "id": "yt--djB-PWhdl0",
      "kind": "yt",
      "videoId": "-djB-PWhdl0",
      "label": "Boston, Massachusetts, USA",
      "lang": "English",
      "lat": 42.3601,
      "lng": -71.0589,
      "r": 130,
      "start": 97,
      "gain": 100,
      "wild": true,
      "hint": "Streamed from YouTube · the creator gets the view.",
      "gate": {
        "origin": "you're a third generation Bostonian — Yeah",
        "originConfidence": "stated",
        "quality": "good",
        "lufs": -23.27
      },
      "source": {
        "who": "Tamron Hall Show",
        "host": "YouTube",
        "license": "standard YouTube licence · streamed, never copied",
        "page": "https://www.youtube.com/watch?v=-djB-PWhdl0",
        "note": "played from 97s, audio only"
      }
    },
    {
      "id": "yt-_3pnHcYuzOQ",
      "kind": "yt",
      "videoId": "_3pnHcYuzOQ",
      "label": "Brooklyn, New York, USA",
      "lang": "English",
      "lat": 40.6015,
      "lng": -73.993,
      "r": 110,
      "start": 41,
      "gain": 60,
      "wild": true,
      "hint": "Streamed from YouTube · the creator gets the view.",
      "gate": {
        "origin": "Bensonhurst, born and raised",
        "originConfidence": "stated",
        "quality": "good",
        "lufs": -11.5
      },
      "source": {
        "who": "News 12",
        "host": "YouTube",
        "license": "standard YouTube licence · streamed, never copied",
        "page": "https://www.youtube.com/watch?v=_3pnHcYuzOQ",
        "note": "played from 41s, audio only"
      }
    },
    {
      "id": "wild-georgetown-south-carolina-usa-us-south",
      "label": "Georgetown, South Carolina, USA (US South)",
      "lang": "English",
      "url": "/clips/accents/wild-georgetown-south-carolina-usa-us-south.mp3",
      "lat": 33.3768,
      "lng": -79.2945,
      "r": 400,
      "size": 333366,
      "wild": true,
      "hint": "Actor introducing himself off the cuff, 42s",
      "start": 16,
      "source": {
        "who": "Bill Oberst Jr. (Voice intro project",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bill_Oberst_Jr_voice.ogg",
        "note": ""
      },
      "lufs": -16.5
    },
    {
      "id": "yt-j1Odp3B7qG4",
      "kind": "yt",
      "videoId": "j1Odp3B7qG4",
      "label": "Ghana",
      "lang": "English",
      "lat": 7.95,
      "lng": -1.03,
      "r": 450,
      "start": 86,
      "gain": 100,
      "wild": true,
      "hint": "Streamed from YouTube · the creator gets the view.",
      "gate": {
        "origin": "I am proud to come from Ghana",
        "originConfidence": "stated",
        "quality": "good",
        "lufs": -18.67
      },
      "source": {
        "who": "AccentBase",
        "host": "YouTube",
        "license": "standard YouTube licence · streamed, never copied",
        "page": "https://www.youtube.com/watch?v=j1Odp3B7qG4",
        "note": "played from 86s, audio only"
      }
    },
    
    {
      "id": "accents-jamaica-english-jamaican-patois",
      "label": "Jamaica",
      "lang": "English / Jamaican Patois",
      "url": "/clips/accents/accents-jamaica-english-jamaican-patois.mp3",
      "lat": 18.11,
      "lng": -77.3,
      "r": 200,
      "size": 1889219,
      "wild": true,
      "start": 130.5,
      "hint": "He slides between English and Patois mid-sentence.",
      "year": 2014,
      "source": {
        "who": "Wikitongues",
        "host": "Wikimedia Commons",
        "license": "CC BY 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:WIKITONGUES-_Omar_Speaking_English_and_Jamaican_Patois.webm",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
    {
      "id": "accents-kenya-english-kenyan",
      "label": "Kenya",
      "lang": "English (Kenyan)",
      "url": "/clips/accents/accents-kenya-english-kenyan.mp3",
      "lat": -1.1,
      "lng": 35.5,
      "r": 450,
      "size": 1920775,
      "wild": true,
      "start": 219.5,
      "hint": "An 800m world-record holder being interviewed right after the race.",
      "source": {
        "who": "VOA News",
        "host": "Wikimedia Commons",
        "license": "US government work (public domain)",
        "page": "https://commons.wikimedia.org/wiki/File:2010-08-23_VOA_News_interview_with_David_Rudisha.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6,
      "year": 2010
    },
    
    {
      "id": "wild-mbaise-imo-state-nigeria",
      "label": "Mbaise, Imo State, Nigeria",
      "lang": "English",
      "url": "/clips/accents/wild-mbaise-imo-state-nigeria.mp3",
      "lat": 5.52,
      "lng": 7.26,
      "r": 500,
      "size": 386447,
      "wild": true,
      "hint": "Activist introducing himself, 48s, strong Nigerian English",
      "start": 12,
      "source": {
        "who": "Recording by Nederlandse Leeuw",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Leo_Igwe_voice_-_en.ogg",
        "note": ""
      },
      "lufs": -16.5,
      "year": 2016
    },
    {
      "id": "wild-melbourne-australia",
      "label": "Melbourne, Australia",
      "lang": "English",
      "url": "/clips/accents/wild-melbourne-australia.mp3",
      "lat": -37.8136,
      "lng": 144.9631,
      "r": 500,
      "size": 303691,
      "wild": true,
      "hint": "Musician introducing herself off the cuff, 38s",
      "start": 17.5,
      "source": {
        "who": "Recording by Nederlandse Leeuw",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Shelley_Segal_voice_-_en.ogg",
        "note": ""
      },
      "lufs": -16.5,
      "year": 2016
    },
    
    {
      "id": "accents-namibia-english-namibian",
      "label": "Namibia",
      "lang": "English (Namibian)",
      "url": "/clips/accents/accents-namibia-english-namibian.mp3",
      "lat": -22.56,
      "lng": 17.08,
      "r": 450,
      "size": 1920878,
      "wild": true,
      "start": 68,
      "hint": "A speaker of Subiya, a language of the Zambezi strip, talking in English.",
      "source": {
        "who": "Wikitongues / Musuweu Theron Kolokwe",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:WIKITONGUES-_Musuweu_speaking_English_and_Subiya.webm",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -17.1,
      "year": 2017
    },
    
    
    {
      "id": "accents-aberdeenshire-scotland-english-northeast-scotl",
      "label": "Northeast Scotland, Scotland",
      "lang": "English (Northeast Scotland / Doric)",
      "url": "/clips/accents/accents-aberdeenshire-scotland-english-northeast-scotl.mp3",
      "lat": 57.25,
      "lng": -2.35,
      "r": 220,
      "size": 1920775,
      "wild": true,
      "start": 115.5,
      "hint": "He switches between his home dialect and English; the clip needs the English stretch.",
      "source": {
        "who": "Wikitongues",
        "host": "Wikimedia Commons",
        "license": "CC BY 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:WIKITONGUES-_David_speaking_Doric_Scots_and_English.webm",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -17,
      "year": 2014
    },
    
    {
      "id": "accents-west-yorkshire-england-english-west-riding-yor",
      "label": "Sheffield, England",
      "lang": "English (West Riding Yorkshire)",
      "url": "/clips/accents/accents-west-yorkshire-england-english-west-riding-yor.mp3",
      "lat": 53.3811,
      "lng": -1.4701,
      "r": 150,
      "size": 1920775,
      "wild": true,
      "start": 174.5,
      "hint": "Broad West Riding · the vowels do the work.",
      "year": 2024,
      "source": {
        "who": "Wikitongues oral histories project",
        "host": "Wikimedia Commons",
        "license": "CC0 (public domain)",
        "page": "https://commons.wikimedia.org/wiki/File:James_speaking_West_Riding_Yorkshire_English.webm",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -17.7
    },
    
    
    {
      "id": "wild-thomastown-county-kilkenny-ireland",
      "label": "Thomastown, County Kilkenny, Ireland",
      "lang": "English",
      "url": "/clips/accents/wild-thomastown-county-kilkenny-ireland.mp3",
      "lat": 52.5264,
      "lng": -7.137,
      "r": 150,
      "size": 1920775,
      "wild": true,
      "hint": "A 94-year-old lifelong local telling stories about the holy well behind his house (14:46 total, pick any segment)",
      "start": 15,
      "source": {
        "who": "Oral history interview by A.-K. D",
        "host": "Wikimedia Commons",
        "license": "CC0 (public domain)",
        "page": "https://commons.wikimedia.org/wiki/File:2024-09-16_Patrick_Lalor_Ladywell.opus",
        "note": ""
      },
      "lufs": -16.6,
      "year": 2024
    }
  ],
  "arabic": [
    {
      "id": "ar-3736",
      "label": "Abu Dhabi, UAE",
      "lang": "Arabic",
      "url": "/clips/ar/ar-3736.mp3",
      "lat": 24.45,
      "lng": 54.38,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Abu Dhabi · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    
    {
      "id": "ar-3384",
      "label": "Aleppo, Syria",
      "lang": "Arabic",
      "url": "/clips/ar/ar-3384.mp3",
      "lat": 36.2,
      "lng": 37.13,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Aleppo · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -18.4
    },
    {
      "id": "ar-2082",
      "label": "Algiers, Algeria",
      "lang": "Arabic",
      "url": "/clips/ar/ar-2082.mp3",
      "lat": 36.75,
      "lng": 3.06,
      "r": 350,
      "size": 240835,
      "hint": "Local radio from Algiers · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
    {
      "id": "ar-249",
      "label": "Amman, Jordan",
      "lang": "Arabic",
      "url": "/clips/ar/ar-249.mp3",
      "lat": 31.95,
      "lng": 35.93,
      "r": 350,
      "size": 240884,
      "hint": "Local radio from Amman · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "ar-39",
      "label": "Annaba, Algeria",
      "lang": "Arabic",
      "url": "/clips/ar/ar-39.mp3",
      "lat": 36.9,
      "lng": 7.77,
      "r": 350,
      "size": 240835,
      "hint": "Local radio from Annaba · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
    {
      "id": "ar-679",
      "label": "Baghdad, Iraq",
      "lang": "Arabic",
      "url": "/clips/ar/ar-679.mp3",
      "lat": 33.31,
      "lng": 44.36,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Baghdad · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
    {
      "id": "arabic-baghdad-iraq-arabic-iraqi",
      "label": "Baghdad, Iraq",
      "lang": "Arabic (Iraqi)",
      "url": "/clips/arabic/arabic-baghdad-iraq-arabic-iraqi.mp3",
      "lat": 33.31,
      "lng": 44.36,
      "r": 220,
      "size": 232132,
      "wild": true,
      "hint": "A Wikitongues speaker talking about their own life.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY-SA 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "ar-2765",
      "label": "Basra, Iraq",
      "lang": "Arabic",
      "url": "/clips/ar/ar-2765.mp3",
      "lat": 30.51,
      "lng": 47.78,
      "r": 350,
      "size": 240678,
      "hint": "Local radio from Basra · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
    {
      "id": "ar-2473",
      "label": "Batna, Algeria",
      "lang": "Arabic",
      "url": "/clips/ar/ar-2473.mp3",
      "lat": 35.56,
      "lng": 6.17,
      "r": 350,
      "size": 240835,
      "hint": "Local radio from Batna · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -17.2
    },
    {
      "id": "ar-2446",
      "label": "Beirut, Lebanon",
      "lang": "Arabic",
      "url": "/clips/ar/ar-2446.mp3",
      "lat": 33.89,
      "lng": 35.5,
      "r": 350,
      "size": 240887,
      "hint": "Local radio from Beirut · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4
    },
    {
      "id": "ar-3107",
      "label": "Benghazi, Libya",
      "lang": "Arabic",
      "url": "/clips/ar/ar-3107.mp3",
      "lat": 32.12,
      "lng": 20.07,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Benghazi · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6
    },
    {
      "id": "ar-809",
      "label": "Blida, Algeria",
      "lang": "Arabic",
      "url": "/clips/ar/ar-809.mp3",
      "lat": 36.47,
      "lng": 2.83,
      "r": 350,
      "size": 240835,
      "hint": "Local radio from Blida · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.7
    },
    {
      "id": "ar-2608",
      "label": "Cairo, Egypt",
      "lang": "Arabic",
      "url": "/clips/ar/ar-2608.mp3",
      "lat": 30.04,
      "lng": 31.24,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Cairo · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4
    },
    {
      "id": "ar-1604",
      "label": "Casablanca, Morocco",
      "lang": "Arabic",
      "url": "/clips/ar/ar-1604.mp3",
      "lat": 33.57,
      "lng": -7.59,
      "r": 350,
      "size": 241066,
      "hint": "Local radio from Casablanca · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "ar-2375",
      "label": "Constantine, Algeria",
      "lang": "Arabic",
      "url": "/clips/ar/ar-2375.mp3",
      "lat": 36.37,
      "lng": 6.61,
      "r": 350,
      "size": 240835,
      "hint": "Local radio from Constantine · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    
    {
      "id": "ar-94",
      "label": "Djelfa, Algeria",
      "lang": "Arabic",
      "url": "/clips/ar/ar-94.mp3",
      "lat": 34.67,
      "lng": 3.25,
      "r": 350,
      "size": 240835,
      "hint": "Local radio from Djelfa · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "ar-3345",
      "label": "Dubai, UAE",
      "lang": "Arabic",
      "url": "/clips/ar/ar-3345.mp3",
      "lat": 25.2,
      "lng": 55.27,
      "r": 350,
      "size": 240887,
      "hint": "Local radio from Dubai · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
    {
      "id": "ar-1907",
      "label": "El Obeid, Sudan",
      "lang": "Arabic",
      "url": "/clips/ar/ar-1907.mp3",
      "lat": 13.18,
      "lng": 30.22,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from El Obeid · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4
    },
    {
      "id": "ar-754",
      "label": "Fes, Morocco",
      "lang": "Arabic",
      "url": "/clips/ar/ar-754.mp3",
      "lat": 34.03,
      "lng": -5,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Fes · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4
    },
    {
      "id": "ar-3132",
      "label": "Gaza, Palestine",
      "lang": "Arabic",
      "url": "/clips/ar/ar-3132.mp3",
      "lat": 31.5,
      "lng": 34.47,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Gaza · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.3
    },
    {
      "id": "ar-3854",
      "label": "Hebron, Palestine",
      "lang": "Arabic",
      "url": "/clips/ar/ar-3854.mp3",
      "lat": 31.53,
      "lng": 35.1,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Hebron · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -17
    },
    {
      "id": "ar-4531",
      "label": "Irbid, Jordan",
      "lang": "Arabic",
      "url": "/clips/ar/ar-4531.mp3",
      "lat": 32.56,
      "lng": 35.85,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Irbid · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4
    },
    {
      "id": "ar-1733",
      "label": "Jeddah, Saudi Arabia",
      "lang": "Arabic",
      "url": "/clips/ar/ar-1733.mp3",
      "lat": 21.49,
      "lng": 39.19,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Jeddah · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6
    },
    {
      "id": "ar-2316",
      "label": "Jerusalem, Palestine",
      "lang": "Arabic",
      "url": "/clips/ar/ar-2316.mp3",
      "lat": 31.78,
      "lng": 35.22,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Jerusalem · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "ar-1526",
      "label": "Kuwait City, Kuwait",
      "lang": "Arabic",
      "url": "/clips/ar/ar-1526.mp3",
      "lat": 29.38,
      "lng": 47.99,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Kuwait City · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "ar-1248",
      "label": "Manama, Bahrain",
      "lang": "Arabic",
      "url": "/clips/ar/ar-1248.mp3",
      "lat": 26.23,
      "lng": 50.59,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Manama · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "ar-1623",
      "label": "Muscat, Oman",
      "lang": "Arabic",
      "url": "/clips/ar/ar-1623.mp3",
      "lat": 23.59,
      "lng": 58.41,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Muscat · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "ar-3190",
      "label": "Nablus, Palestine",
      "lang": "Arabic",
      "url": "/clips/ar/ar-3190.mp3",
      "lat": 32.22,
      "lng": 35.26,
      "r": 350,
      "size": 241118,
      "hint": "Local radio from Nablus · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4
    },
    {
      "id": "ar-5182",
      "label": "Omdurman, Sudan",
      "lang": "Arabic",
      "url": "/clips/ar/ar-5182.mp3",
      "lat": 15.64,
      "lng": 32.48,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Omdurman · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -18.7
    },
    {
      "id": "ar-423",
      "label": "Oran, Algeria",
      "lang": "Arabic",
      "url": "/clips/ar/ar-423.mp3",
      "lat": 35.7,
      "lng": -0.63,
      "r": 350,
      "size": 240835,
      "hint": "Local radio from Oran · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6
    },
    {
      "id": "ar-1879",
      "label": "Port Sudan, Sudan",
      "lang": "Arabic",
      "url": "/clips/ar/ar-1879.mp3",
      "lat": 19.62,
      "lng": 37.22,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Port Sudan · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4
    },
    {
      "id": "ar-989",
      "label": "Rabat, Morocco",
      "lang": "Arabic",
      "url": "/clips/ar/ar-989.mp3",
      "lat": 34.02,
      "lng": -6.84,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Rabat · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -15.6
    },
    
    {
      "id": "ar-2787",
      "label": "Riyadh, Saudi Arabia",
      "lang": "Arabic",
      "url": "/clips/ar/ar-2787.mp3",
      "lat": 24.71,
      "lng": 46.68,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Riyadh · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "ar-4464",
      "label": "Setif, Algeria",
      "lang": "Arabic",
      "url": "/clips/ar/ar-4464.mp3",
      "lat": 36.19,
      "lng": 5.41,
      "r": 350,
      "size": 240835,
      "hint": "Local radio from Setif · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "ar-6196",
      "label": "Sharjah, UAE",
      "lang": "Arabic",
      "url": "/clips/ar/ar-6196.mp3",
      "lat": 25.35,
      "lng": 55.42,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Sharjah · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4
    },
    {
      "id": "ar-5408",
      "label": "Taiz, Yemen",
      "lang": "Arabic",
      "url": "/clips/ar/ar-5408.mp3",
      "lat": 13.58,
      "lng": 44.02,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Taiz · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -15.9
    },
    {
      "id": "ar-3647",
      "label": "Tangier, Morocco",
      "lang": "Arabic",
      "url": "/clips/ar/ar-3647.mp3",
      "lat": 35.77,
      "lng": -5.8,
      "r": 350,
      "size": 240974,
      "hint": "Local radio from Tangier · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "ar-6858",
      "label": "Tripoli, Libya",
      "lang": "Arabic",
      "url": "/clips/ar/ar-6858.mp3",
      "lat": 32.89,
      "lng": 13.19,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Tripoli · ARCADE corpus.",
      "start": 9.5,
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "ar-3660",
      "label": "Tunis, Tunisia",
      "lang": "Arabic",
      "url": "/clips/ar/ar-3660.mp3",
      "lat": 36.81,
      "lng": 10.18,
      "r": 350,
      "size": 240887,
      "hint": "Local radio from Tunis · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "ar-3785",
      "label": "Wad Medani, Sudan",
      "lang": "Arabic",
      "url": "/clips/ar/ar-3785.mp3",
      "lat": 14.4,
      "lng": 33.52,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Wad Medani · ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -17.1
    }
  ],
  "french": [
    {"id":"yt-4jKukUPJdmM","kind":"yt","videoId":"4jKukUPJdmM","label":"Kinshasa, DR Congo","lang":"French","lat":-4.4419,"lng":15.2663,"r":150,"start":153,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Kinshasa, Democratic Republic of the Congo","offBy":14,"confidence":95,"evidence":["seamless switching between French and Lingala","the pronunciation of 'portefeuille' with a distinct Congolese French accent","use of Lingala words like 'mbongo' for money and 'mpona ngai' for 'for me'"],"title":"les élèves du congo , c'est honteux mdrr y'a du boulot","author":"Misterkash -  Le photographe en costume "},"deck":"french","evalExclude":true,"source":{"who":"Misterkash -  Le photographe en costume ","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=4jKukUPJdmM","note":"les élèves du congo , c'est honteux mdrr y'a du boulot"}},
    
    {"id":"yt-BJH4f6OWF7U","kind":"yt","videoId":"BJH4f6OWF7U","label":"Marseille, France","lang":"French","lat":43.2965,"lng":5.3698,"r":60,"start": 60,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Marseille, France","offBy":0,"confidence":95,"evidence":["Nasal vowels produced with a distinct velar coda sound (e.g. 'paing')","Melodic Southern French intonation and rhythm","Local vocabulary and reference to the Vieux-Port of Marseille"],"title":"Ils font croire que Macron va interdire l'accent Marseillais","author":"Makambo ya Mokili Tv Officiel"},"evalExclude":true,"source":{"who":"Makambo ya Mokili Tv Officiel","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=BJH4f6OWF7U","note":"Ils font croire que Macron va interdire l'accent Marseillais"}},
    {"id":"yt-F53zsQIKlrw","kind":"yt","videoId":"F53zsQIKlrw","label":"Brussels, Belgium","lang":"French","lat":50.8503,"lng":4.3517,"r":50,"start":225,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Paris, France","offBy":264,"confidence":85,"evidence":["fluent Metropolitan French phonology","standard uvular rhotic /r/ sound","typical Parisian/northern French intonation patterns"],"title":"Ce que les BELGES pensent des FRANCAIS (Micro-trottoir)","author":"TITAN - Le média"},"evalExclude":true,"source":{"who":"TITAN - Le média","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=F53zsQIKlrw","note":"Ce que les BELGES pensent des FRANCAIS (Micro-trottoir)"}},
    {"id":"yt--NT24O3IfPs","kind":"yt","videoId":"-NT24O3IfPs","label":"Marseille, France","lang":"French","lat":43.2965,"lng":5.3698,"r":60,"start":115,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Provence-Alpes-Côte d'Azur, France","offBy":27,"confidence":75,"evidence":["Metropolitan French speech","Distinct Southern French (Méridional) cadence in the second speaker","Slightly open vowel quality on final syllables"],"title":"Micro-Trottoir : Municipales 2026","author":"AnonymalTV"},"evalExclude":true,"source":{"who":"AnonymalTV","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=-NT24O3IfPs","note":"Micro-Trottoir : Municipales 2026"}},
    {"id":"yt-0xDjLQpsmUM","kind":"yt","videoId":"0xDjLQpsmUM","label":"Marseille, France","lang":"French","lat":43.2965,"lng":5.3698,"r":60,"start":149,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Marseille, France","offBy":0,"confidence":85,"evidence":["Distinct Southern French / Provençal intonation and rhythm","Pronunciation of final schwas ('farce-u', 'mercantile-u')","Street interview topic concerning rivalry with Parisians ('les Parisiens')"],"title":"Ce que les Marseillais pensent des Parisiens","author":"Monsieur Alex +"},"evalExclude":true,"source":{"who":"Monsieur Alex +","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=0xDjLQpsmUM","note":"Ce que les Marseillais pensent des Parisiens"}},
    {"id":"yt-SFh4sdSqR60","kind":"yt","videoId":"SFh4sdSqR60","label":"Abidjan, Côte d'Ivoire","lang":"French","lat":5.36,"lng":-4.0083,"r":70,"start":118,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Abidjan, Côte d'Ivoire","offBy":0,"confidence":90,"evidence":["Explicit mention of 'wôro-wôro' (Abidjan's iconic shared taxis)","Characteristic Ivorian grammar and idioms ('toi là', 'même pas même')","Ivorian French / Nouchi accent and speech cadence"],"title":"MICRO TROTTOIR //ABIDJAN ABOBO #INOV_TV","author":"Inov TV"},"evalExclude":true,"source":{"who":"Inov TV","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=SFh4sdSqR60","note":"MICRO TROTTOIR //ABIDJAN ABOBO #INOV_TV"}},
    {
      "id": "french-bargny-senegal-french-senegal",
      "label": "Bargny, Senegal",
      "lang": "French (Senegal)",
      "url": "/clips/french/french-bargny-senegal-french-senegal.mp3",
      "lat": 14.6937,
      "lng": -17.2261,
      "r": 300,
      "size": 1094991,
      "wild": true,
      "start": 68.5,
      "hint": "Residents of a coastal town watching the sea and the factories eat their shoreline.",
      "source": {
        "who": "VOA Afrique",
        "host": "Wikimedia Commons",
        "license": "US government work (public domain)",
        "page": "https://commons.wikimedia.org/wiki/File:S%C3%A9n%C3%A9gal_-_Bargny,_un_littoral_menac%C3%A9_par_la_pollution_et_l%27%C3%A9rosion_c%C3%B4ti%C3%A8re_(1).webm",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
    {
      "id": "french-brussels-belgium-french-belgian",
      "label": "Belgium",
      "lang": "French (Belgian)",
      "url": "/clips/french/french-brussels-belgium-french-belgian.mp3",
      "lat": 50.6402,
      "lng": 4.6667,
      "r": 180,
      "size": 1920775,
      "start": 3,
      "hint": "Second half of a two-part Wikipedia reading about a Gaulish hillfort – dry subject, but the reader flags his own 'léger accent belge' right on the file page.",
      "source": {
        "who": "Wilimut, French Wikipedia spoken-article project",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bibracte2.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
    {
      "id": "french-yaounde-cameroon-french-cameroon",
      "label": "Cameroon",
      "lang": "French (Cameroon)",
      "url": "/clips/french/french-yaounde-cameroon-french-cameroon.mp3",
      "lat": 4.5,
      "lng": 11.5,
      "r": 350,
      "size": 1920989,
      "wild": true,
      "start": 132.5,
      "hint": "A football journalist who's literally written two books on the Cameroonian game breaks down what a former national-team striker's federation election really means back home.",
      "source": {
        "who": "VOA Afrique / John Lyndon (interviewer",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:R%C3%A9action_du_journaliste_Jean-Bruno_Tagne_%C3%A0_l%27%C3%A9lection_de_Samuel_Eto%27o_au_comit%C3%A9_ex%C3%A9cutif_de_la_CAF_20641161-ec1c-44c9-0756-08dd5c8b1668_hq.mp3",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
    {
      "id": "french-abidjan-cote-d-ivoire-french-cote-d-ivoire",
      "label": "Côte d'Ivoire",
      "lang": "French (Côte d'Ivoire)",
      "url": "/clips/french/french-abidjan-cote-d-ivoire-french-cote-d-ivoire.mp3",
      "lat": 6.8,
      "lng": -5.2,
      "r": 320,
      "size": 1664251,
      "wild": true,
      "start": 116.5,
      "hint": "VOA's cocoa-harvest dispatch from Côte d'Ivoire – local growers explain how unusually heavy rains are threatening the crop that keeps the country running.",
      "source": {
        "who": "VOA Afrique / Yassin Ciyow",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:Production_de_cacao_ivorienne_VOA_01000000-0aff-0242-01e6-08db257d93df_720p.webm",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6
    },
    {
      "id": "french-paris-france-french-paris",
      "label": "Paris, France",
      "lang": "French (Paris)",
      "url": "/clips/french/french-paris-france-french-paris.mp3",
      "lat": 48.8566,
      "lng": 2.3522,
      "r": 120,
      "size": 1920775,
      "start": 11,
      "hint": "A Wikipedia volunteer reads the full article on the British Museum – not exactly a British Museum topic hint, but his own accent tag on the file page says Paris.",
      "source": {
        "who": "ArthurLutz, French Wikipedia 'Projet:Articles audio'",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:British_Museum.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6
    },
    {
      "id": "french-montreal-canada-french-quebecois",
      "label": "Québec, Canada",
      "lang": "French (Québécois)",
      "url": "/clips/french/french-montreal-canada-french-quebecois.mp3",
      "lat": 46.8139,
      "lng": -71.208,
      "r": 350,
      "size": 1920775,
      "wild": true,
      "start": 172.5,
      "hint": "He's a self-described native Québécois French speaker recorded far from home in Slovenia – listen for those 18th-century vowels and English loanwords Quebec French is known for.",
      "source": {
        "who": "Wikitongues / Maxime Rioux",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:WIKITONGUES-_Maxime_speaking_Qu%C3%A9becois_French.webm",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.7
    },
    {
      "id": "french-marseille-france-french-southern-france",
      "label": "Southern France, France",
      "lang": "French (Southern France)",
      "url": "/clips/french/french-marseille-france-french-southern-france.mp3",
      "lat": 43.7,
      "lng": 4.5,
      "r": 260,
      "size": 475890,
      "start": 35.5,
      "hint": "A French Wikinews volunteer reads a short news bulletin about a building collapse – the story is set in Marseille, but it's his own file-tagged 'South of France' accent that actually places ",
      "source": {
        "who": "Bastien65 (reader), Savant-fou & Malfidus (jingle), French Wikinews",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:2018-11-10_%E2%80%93_Marseille_trois_immeubles_s%27%C3%A9croulent_dans_le_1er_arrondissement,_plusieurs_morts.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6
    }
  ],
  "spanish": [
    {"id":"yt-k1ur2rnVKLs","kind":"yt","videoId":"k1ur2rnVKLs","label":"Bogotá, Colombia","lang":"Spanish","lat":4.711,"lng":-74.0721,"r":60,"start":40,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Bogotá, Colombia","offBy":0,"confidence":90,"evidence":["Direct reference to Bogotá's TransMilenio transit system","Distinctive melodic musical intonation of central Andean Colombia","Fully pronounced syllable-final 's' consonants"],"title":"El hombre del tapabocas | CityTv","author":"CityTv"},"evalExclude":true,"source":{"who":"CityTv","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=k1ur2rnVKLs","note":"El hombre del tapabocas | CityTv"}},
    {"id":"yt-1tdOI0X0phE","kind":"yt","videoId":"1tdOI0X0phE","label":"Buenos Aires, Argentina","lang":"Spanish","lat":-34.6037,"lng":-58.3816,"r":60,"start":33,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Buenos Aires, Argentina","offBy":0,"confidence":95,"evidence":["distinctive Rioplatense intonation and speech rhythm","use of Argentine regional vocabulary like 'colectivo' (bus) and 're mal'","word choice including 'buena onda' and 'lío'"],"title":"Así era el acento porteño en los años '90 en Argentina","author":"GLH HaxBall"},"evalExclude":true,"source":{"who":"GLH HaxBall","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=1tdOI0X0phE","note":"Así era el acento porteño en los años '90 en Argentina"}},
    {"id":"yt-zcasomU6Ios","kind":"yt","videoId":"zcasomU6Ios","label":"Buenos Aires, Argentina","lang":"Spanish","lat":-34.6037,"lng":-58.3816,"r":60,"start":122,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Buenos Aires, Argentina","offBy":0,"confidence":92,"evidence":["Distinctive Rioplatense intonation and speech rhythm","Use of regional slang \"chorro\" for thief","Frequent tag question \"viste\""],"title":"\"Mato al chorro, mato al juez\" ENTREVISTA COMPLETA ORIGINAL.","author":"Sentidos Audiovisuales"},"evalExclude":true,"source":{"who":"Sentidos Audiovisuales","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=zcasomU6Ios","note":"\"Mato al chorro, mato al juez\" ENTREVISTA COMPLETA ORIGINAL."}},
    {"id":"yt-CprjAdAO11s","kind":"yt","videoId":"CprjAdAO11s","label":"Bogotá, Colombia","lang":"Spanish","lat":4.711,"lng":-74.0721,"r":60,"start":50,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Bogotá, Colombia","offBy":0,"confidence":80,"evidence":["Crisp preservation of final 's' sounds","Gentle, musical pitch cadence characteristic of interior Colombian Spanish","Soft 'y' sound without heavy friction"],"title":"BOGOTA, Colombia l Entrevistas por la calle","author":"New CITYzens"},"evalExclude":true,"source":{"who":"New CITYzens","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=CprjAdAO11s","note":"BOGOTA, Colombia l Entrevistas por la calle"}},
    
    {
      "id": "spanish-argentine-spanish-reading-about-a-brazilian-to",
      "label": "Argentina",
      "lang": "es",
      "url": "/clips/spanish/spanish-argentine-spanish-reading-about-a-brazilian-to.mp3",
      "lat": -34.6037,
      "lng": -58.3816,
      "r": 250,
      "size": 1286313,
      "start": 30,
      "hint": "Ideal case: topic is a Brazilian town, completely unconnected to Argentina. Country-level accent tag only, pinned at Buenos Aires with wide radius.",
      "source": {
        "who": "Eduardo P",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Es-ar_Andrel%C3%A2ndia.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6
    },
    {
      "id": "spanish-venezuelan-spanish-introduction-to-the-big-ban",
      "label": "Guatire, Venezuela",
      "lang": "es",
      "url": "/clips/spanish/spanish-venezuelan-spanish-introduction-to-the-big-ban.mp3",
      "lat": 10.4753,
      "lng": -66.5425,
      "r": 120,
      "size": 1920775,
      "start": 30,
      "hint": "Soft ambient background music plays low under the narration throughout the reading; speech remains dominant and intelligible. Used the transcoded MP3 (original FLAC was slightly over the 40M",
      "source": {
        "who": "Wilfredor (Wilfredo Rafael Rodríguez Hernández",
        "host": "Wikimedia Commons",
        "license": "CC0 (public domain)",
        "page": "https://commons.wikimedia.org/wiki/File:Big_bang_introduction_article_wikipedia_spanish.flac",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6
    },
    {
      "id": "spanish-mexico-city-mexico-spanish-mexican",
      "label": "Mexico",
      "lang": "Spanish (Mexican)",
      "url": "/clips/spanish/spanish-mexico-city-mexico-spanish-mexican.mp3",
      "lat": 19.4326,
      "lng": -99.1332,
      "r": 500,
      "size": 1920775,
      "start": 10,
      "hint": "A quick home-remedy explainer on heartburn, read by a Wikipedia volunteer.",
      "source": {
        "who": "Guirrohl",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:Es-Agruras-article.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -17
    },
    {
      "id": "spanish-mexican-spanish-schrodinger-s-cat-article-read",
      "label": "Mexico",
      "lang": "es",
      "url": "/clips/spanish/spanish-mexican-spanish-schrodinger-s-cat-article-read.mp3",
      "lat": 19.4326,
      "lng": -99.1332,
      "r": 500,
      "size": 772432,
      "hint": "NOT the already-used Mexican medical-article reading · this is a different reader/topic. Short (1:36) but clean. Country-level tag only, no specific city, pinned at Mexico City with wide rad",
      "source": {
        "who": "Luisrey89~commonswiki",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Es-GATODESCHR%C3%96DINGER-article.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6
    },
    {
      "id": "spanish-uruguayan-spanish-juan-jose-morosoli-reads-la-",
      "label": "Minas, Uruguay",
      "lang": "es",
      "url": "/clips/spanish/spanish-uruguayan-spanish-juan-jose-morosoli-reads-la-.mp3",
      "lat": -34.375,
      "lng": -55.2379,
      "r": 120,
      "size": 674421,
      "hint": "Checked full text on Wikisource: the story names no real places at all (only generic 'sierra,' 'valle,' 'mi terruño') · no Uruguay or Montevideo mention. Archival 1946 radio recording, PD un",
      "source": {
        "who": "Juan José Morosoli / Museo de la Palabra del SODRE (Uruguay",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:Juan_José_Morosoli_lee_'La_Geografía'.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4,
      "year": 1946
    },
    {
      "id": "spanish-paniahue-santa-cruz-chile-spanish-chilean",
      "label": "Paniahue, Chile",
      "lang": "Spanish (Chilean)",
      "url": "/clips/spanish/spanish-paniahue-santa-cruz-chile-spanish-chilean.mp3",
      "lat": -34.63,
      "lng": -71.36,
      "r": 200,
      "size": 959051,
      "wild": true,
      "start": 50,
      "hint": "An earthquake survivor describing the tent city her neighborhood became.",
      "source": {
        "who": "Diego Grez / Wikinews, hosted on",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Interview_with_Juana_Bustamante_(Full).ogv",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.7
    },
    {
      "id": "spanish-peruvian-spanish-richard-dawkins-biography-rea",
      "label": "Peru",
      "lang": "es",
      "url": "/clips/spanish/spanish-peruvian-spanish-richard-dawkins-biography-rea.mp3",
      "lat": -12.0464,
      "lng": -77.0428,
      "r": 250,
      "size": 1265833,
      "hint": "Only country-level origin is documented (no specific city), so the pin is placed at the capital, Lima, with a wide accept radius. Duration 2:38, verified via direct file-page fetch.",
      "source": {
        "who": "César Anglas Rabines",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Es-Richard_Dawkins-article.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "spanish-puerto-rican-spanish-roman-emperor-claudius-ar",
      "label": "Puerto Rico",
      "lang": "es",
      "url": "/clips/spanish/spanish-puerto-rican-spanish-roman-emperor-claudius-ar.mp3",
      "lat": 18.4655,
      "lng": -66.1057,
      "r": 120,
      "size": 1904057,
      "hint": "Ancient Roman history topic, nothing to do with the Caribbean. Duration 3:58, clean single male voice.",
      "source": {
        "who": "Boricuaeddie",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Es-Claudio-article.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -17.8
    },
    {
      "id": "spanish-castilian-spanish-segismundo-s-soliloquy-calde",
      "label": "Spain",
      "lang": "es",
      "url": "/clips/spanish/spanish-castilian-spanish-segismundo-s-soliloquy-calde.mp3",
      "lat": 40.4168,
      "lng": -3.7038,
      "r": 250,
      "size": 993533,
      "hint": "Classic Golden Age theatre monologue · geography-free content by nature, no Spain/Madrid references. Only regional-category documentation (no specific city), pinned at Madrid with wide radiu",
      "source": {
        "who": "Txo",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:Segismundo.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -17.1
    },
    {
      "id": "spanish-colombian-spanish-steven-pinker-biography-read",
      "label": "Turbaco, Colombia",
      "lang": "es",
      "url": "/clips/spanish/spanish-colombian-spanish-steven-pinker-biography-read.mp3",
      "lat": 10.3306,
      "lng": -75.4136,
      "r": 120,
      "size": 1920775,
      "hint": "Scripted Wikipedia-article reading; clear single male voice, no background noise. Verified via direct fetch of the Commons file page (duration 8:22, CC BY-SA 3.0).",
      "source": {
        "who": "Libardomm",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Es-Steven-Pinker-article.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.3
    }
  ],
  "chinese": [
    {"id":"yt--eaOysvmbCI","kind":"yt","videoId":"-eaOysvmbCI","label":"Xi'an, China","lang":"Mandarin","lat":34.3416,"lng":108.9398,"r":140,"start":30,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Xi'an, China","offBy":9,"confidence":95,"evidence":["your use of '沟子' (gōu zi) to mean buttocks","the slang term '弄怂' (nòng sǒng) to mean messing around or making a fool of someone","the classic northwestern slang '锤子' (chuí zi)"],"title":"西安高温七十度街头随访","author":"可西西"},"deck":"chinese","evalExclude":true,"source":{"who":"可西西","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=-eaOysvmbCI","note":"西安高温七十度街头随访"}},
    {"id":"yt-FfDtxav-R2A","kind":"yt","videoId":"FfDtxav-R2A","label":"Guangzhou, China","lang":"Cantonese","lat":23.1291,"lng":113.2644,"r":100,"start":119,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Hong Kong, Hong Kong","offBy":129,"confidence":95,"evidence":["natural use of colloquial Cantonese terms like '諗起' (thinking of)","typical Hong Kong pronunciation of '學校' (school)","seamless integration of the loanword '拜拜' (bye-bye)"],"title":"【好嘢街訪】廣州人一定要識廣州話！","author":"你好嘢video"},"deck":"chinese","evalExclude":true,"source":{"who":"你好嘢video","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=FfDtxav-R2A","note":"【好嘢街訪】廣州人一定要識廣州話！"}},
    {"id":"yt-7TPAXwQ6Xig","kind":"yt","videoId":"7TPAXwQ6Xig","label":"Chengdu, China","lang":"Chinese","lat":30.5728,"lng":104.0668,"r":60,"start":132,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Chengdu, Sichuan, China","offBy":10,"confidence":85,"evidence":["Southwestern Mandarin intonation and tones","Sichuanese lexical phrasing","characteristic phonology of Southwestern dialects"],"title":"四川方言：老表拖欠民工工资，跑回家乡充大款，太可笑了！","author":"爆笑巴蜀"},"evalExclude":true,"source":{"who":"爆笑巴蜀","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=7TPAXwQ6Xig","note":"四川方言：老表拖欠民工工资，跑回家乡充大款，太可笑了！"}},
    {"id":"yt-1iMMUDdCjso","kind":"yt","videoId":"1iMMUDdCjso","label":"Beijing, China","lang":"Chinese","lat":39.9042,"lng":116.4074,"r":60,"start":75,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Beijing, China","offBy":0,"confidence":75,"evidence":["Standard Putonghua standard rhythm and soft retroflexes","Northern Chinese vowel quality on 'xuéli' and 'shíxí'","Clear distinction between alveolar and retroflex consonants"],"title":"北京街头采访Beijing Street Interview: 行政Administration","author":"北京360行"},"evalExclude":true,"source":{"who":"北京360行","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=1iMMUDdCjso","note":"北京街头采访Beijing Street Interview: 行政Administration"}},
    {"id":"yt-6yRcJ-BUVDg","kind":"yt","videoId":"6yRcJ-BUVDg","label":"Chengdu, China","lang":"Chinese","lat":30.5728,"lng":104.0668,"r":60,"start": 204,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Chengdu, Sichuan, China","offBy":10,"confidence":85,"evidence":["Use of Southwestern Mandarin modal particle \"噻\" (sai)","Characteristic Sichuan tone contours and vowel quality","Sichuanese sentence-final intonation patterns"],"title":"【方言挑战】两个老外挑战四川话，哪个瓜娃子学得最像呢？？","author":"口语老炮儿马思瑞 Laoma Chris"},"evalExclude":true,"source":{"who":"口语老炮儿马思瑞 Laoma Chris","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=6yRcJ-BUVDg","note":"【方言挑战】两个老外挑战四川话，哪个瓜娃子学得最像呢？？"}},
    {
      "id": "chinese-chengdu-china-mandarin-sichuanese-chengdu-dial",
      "label": "Chengdu, China",
      "lang": "Mandarin (Sichuanese, Chengdu dialect)",
      "url": "/clips/chinese/chinese-chengdu-china-mandarin-sichuanese-chengdu-dial.mp3",
      "lat": 30.5728,
      "lng": 104.0668,
      "r": 120,
      "size": 265030,
      "hint": "Just over half a minute · the same fable linguists use worldwide to sample accents, this time in full Chengdu Sichuanese.",
      "source": {
        "who": "contributor, \"成都话 - 北风和太阳\" (The North Wind and the Sun, Chengdu dialect",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:%E6%88%90%E9%83%BD%E8%AF%9D_-_%E5%8C%97%E9%A3%8E%E5%92%8C%E5%A4%AA%E9%98%B3.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.7
    },
    
    {
      "id": "chinese-guiyang-china-mandarin-guiyangese-southwestern",
      "label": "Guiyang, China",
      "lang": "Mandarin (Guiyangese, Southwestern Mandarin)",
      "url": "/clips/chinese/chinese-guiyang-china-mandarin-guiyangese-southwestern.mp3",
      "lat": 26.647,
      "lng": 106.6302,
      "r": 120,
      "size": 1920775,
      "wild": true,
      "start": 122.5,
      "hint": "Two grandparents genuinely reminiscing, not reading a script · pure Southwest China drawl, a thousand km from the capital.",
      "source": {
        "who": "Wikitongues (speakers: Huang Chaofen & Wang Changjiu), \"Changjiu and Chaofen speaking Guiyangese (Southwestern Mandarin)\"",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:WIKITONGUES-_Changjiu_and_Chaofen_speaking_Guiyangese_(Southwestern_Mandarin).oga",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.7
    },
    {
      "id": "chinese-hk-cantonese-george-washington-carver-spoken-w",
      "label": "Hong Kong",
      "lang": "yue",
      "url": "/clips/chinese/chinese-hk-cantonese-george-washington-carver-spoken-w.mp3",
      "lat": 22.3193,
      "lng": 114.1694,
      "r": 120,
      "size": 1920775,
      "hint": "Straight reading of the Wikipedia biography, no self-introduction. Any 20s window works; the first few seconds just name the article subject (an American scientist), not the speaker's locati",
      "source": {
        "who": "Recording by Carrotkit, uploaded by 胡葡萄",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:喬治·華盛頓·卡弗_-_zh-yue.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.9
    },
    {
      "id": "chinese-hk-cantonese-ciguatoxin-stonefish-toxin-spoken",
      "label": "Hong Kong",
      "lang": "yue",
      "url": "/clips/chinese/chinese-hk-cantonese-ciguatoxin-stonefish-toxin-spoken.mp3",
      "lat": 22.3193,
      "lng": 114.1694,
      "r": 120,
      "size": 1920775,
      "hint": "Dense science-article reading, no intro chit-chat. Any segment works. Same voice as the Carver clip above.",
      "source": {
        "who": "Recording by Carrotkit, uploaded by 胡葡萄",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:刺尾魚毒素_-_zh-yue.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -17.1
    },
    
    {
      "id": "chinese-shanghainese-wu-standard-shanghai-accent-readi",
      "label": "Shanghai, China",
      "lang": "wuu",
      "url": "/clips/chinese/chinese-shanghainese-wu-standard-shanghai-accent-readi.mp3",
      "lat": 31.2304,
      "lng": 121.4737,
      "r": 120,
      "size": 1764249,
      "start": 60,
      "hint": "Formal recitation of a famous classical-Chinese essay, no self-introduction. Good geography-free content since the essay's subject (Yueyang, Hunan) is a different province from the speaker's",
      "source": {
        "who": "Recording by Wikimedia user Legolas1024",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Zh-wuu-岳阳楼记.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
    {
      "id": "chinese-taipei-taiwan-mandarin-taiwan-guoyu",
      "label": "Taiwan",
      "lang": "Mandarin (Taiwan Guoyu)",
      "url": "/clips/chinese/chinese-taipei-taiwan-mandarin-taiwan-guoyu.mp3",
      "lat": 23.8,
      "lng": 120.96,
      "r": 220,
      "size": 1920775,
      "start": 133.5,
      "hint": "Tagged simply 'zh-tw' by the reader · softer retroflexes and no erhua is the giveaway that this is Taiwan Guoyu, not mainland Mandarin.",
      "source": {
        "who": "Spoken Chinese Wikipedia contributor, \"Zh-tw-魔術師和兔子.ogg\"",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Zh-tw-%E9%AD%94%E8%A1%93%E5%B8%AB%E5%92%8C%E5%85%94%E5%AD%90.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.9
    },
    {
        "start": 134, "id": "chinese-taiwan-mandarin-good-cop-bad-dog-tv-episode-sp",
      "label": "Taiwan",
      "lang": "zh",
      "url": "/clips/chinese/chinese-taiwan-mandarin-good-cop-bad-dog-tv-episode-sp.mp3",
      "lat": 23.8,
      "lng": 120.96,
      "r": 220,
      "size": 1920775,
      "hint": "12-minute article reading, plenty of clean mid-file segments to pull a 20s window from.",
      "source": {
        "who": "Recording by Wikimedia user Sharonlan1203",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Zh-tw-好警察壞狗狗.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.9
    }
  ],
  "hindi-urdu": [
    {"id":"yt-vogXu3dUXzE","kind":"yt","videoId":"vogXu3dUXzE","label":"Delhi, India","lang":"Hindi","lat":28.6139,"lng":77.209,"r":100,"start":106,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Delhi, India","offBy":0,"confidence":85,"evidence":["the clear dental pronunciation of 'Vande Mataram'","the standard urban North Indian Hindi intonation in 'yahi bacha rahi thi'","the typical Indian English pronunciation of 'National Anthem'"],"title":"How Much Delhi Knows About India | Independence Day Special 🫡 | Street Interview | Jeheranium","author":"Jeheranium"},"deck":"hindi-urdu","evalExclude":true,"source":{"who":"Jeheranium","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=vogXu3dUXzE","note":"How Much Delhi Knows About India | Independence Day Special 🫡 | Street Interview | Jeheranium"}},
    {"id":"yt-Td9sfMaU7u0","kind":"yt","videoId":"Td9sfMaU7u0","label":"Delhi, India","lang":"Hindi","lat":28.6139,"lng":77.209,"r":100,"start":195,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Delhi, India","offBy":0,"confidence":85,"evidence":["use of the colloquial North Indian word 'lenter' for a concrete roof slab","distinctive North Indian Hinglish rhythm and sentence structure","retroflex pronunciation of 't' and 'd' in English words like 'smartness'"],"title":"Ladko ko kaisi ladkiyan pasand aati hai |What men want in women Pt 3 | Public Hai Ye Sab Janti Hai","author":"Jeheranium"},"deck":"hindi-urdu","evalExclude":true,"source":{"who":"Jeheranium","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=Td9sfMaU7u0","note":"Ladko ko kaisi ladkiyan pasand aati hai |What men want in women Pt 3 | Public Hai Ye Sab Janti Hai"}},
    {"id":"yt-zRpMJRph-wk","kind":"yt","videoId":"zRpMJRph-wk","label":"Karachi, Pakistan","lang":"Urdu","lat":24.8607,"lng":67.0011,"r":100,"start":217,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Karachi, Pakistan","offBy":0,"confidence":85,"evidence":["your 'kh' in 'khayal' has a strong, raspy friction sound","the 't' in 'tweet' and 'd' in 'dollar' are pronounced with a soft retroflex tap","the word 'ekdum' is used naturally to mean completely or right away"],"title":"“Karachi Better Than Paris?” | Sindh To Build A City Better Than Dubai? | Shabbar Zaidi’s Statement","author":"GTV NETWORK HD"},"deck":"hindi-urdu","evalExclude":true,"source":{"who":"GTV NETWORK HD","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=zRpMJRph-wk","note":"“Karachi Better Than Paris?” | Sindh To Build A City Better Than Dubai? | Shabbar Zaidi’s Statement"}},
    {"id":"yt-ueueRlk1NtM","kind":"yt","videoId":"ueueRlk1NtM","label":"Lahore, Pakistan","lang":"Urdu","lat":31.5204,"lng":74.3587,"r":100,"start":63,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Lahore, Pakistan","offBy":0,"confidence":85,"evidence":["using the Punjabi word 'te' for 'and'","the pronunciation of 'meehna' for month","the Punjabi grammatical structure in 'subah de khare hain'"],"title":"گولڈن مین اسٹریٹ پرفارمر کا اصل چہرہ| کتنی کمائی؟ گھر کے حالات اور مکمل کہانی Income, Life Struggles","author":"multimedia network"},"deck":"hindi-urdu","evalExclude":true,"source":{"who":"multimedia network","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=ueueRlk1NtM","note":"گولڈن مین اسٹریٹ پرفارمر کا اصل چہرہ| کتنی کمائی؟ گھر کے حالات اور مکمل کہانی Income, Life Struggles"}},
    {"id":"yt-NwY5FscYpKs","kind":"yt","videoId":"NwY5FscYpKs","label":"Lucknow, India","lang":"Hindi","lat":26.8467,"lng":80.9462,"r":100,"start":113,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Delhi, India","offBy":417,"confidence":85,"evidence":["the retroflex 'd' in 'bada'","the clear dental 'th' in 'saathi'","the casual blending of Hindi with English terms like 'friend zone'"],"title":"LUCKNOW ON LOVE & HEARTBREAK Street Interview Lucknowi Shaan Shahid India Girls & Boys Opinion","author":"Dr Shaan Shahid (PT)"},"deck":"hindi-urdu","evalExclude":true,"source":{"who":"Dr Shaan Shahid (PT)","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=NwY5FscYpKs","note":"LUCKNOW ON LOVE & HEARTBREAK Street Interview Lucknowi Shaan Shahid India Girls & Boys Opinion"}},
    {"id":"yt-BJHw8b01C24","kind":"yt","videoId":"BJHw8b01C24","label":"Patna, India","lang":"Hindi","lat":25.5941,"lng":85.1376,"r":120,"start":64,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Patna, India","offBy":0,"confidence":80,"evidence":["the clear, slightly retroflexed consonants in words like 'pukhta' and 'intezaam'","the flat, unrounded vowel in 'ho raha hai'","the distinct North Indian rhythm and stress patterns on words like 'suraksha' and 'nigraani'"],"title":"PM Modi Patna Rally को लेकर सुरक्षा के इंतज़ाम पर Exclusive Interview","author":"News4Nation"},"deck":"hindi-urdu","evalExclude":true,"source":{"who":"News4Nation","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=BJHw8b01C24","note":"PM Modi Patna Rally को लेकर सुरक्षा के इंतज़ाम पर Exclusive Interview"}},
    {"id":"yt-tZV_e58UDFk","kind":"yt","videoId":"tZV_e58UDFk","label":"Jaipur, India","lang":"Hindi","lat":26.9124,"lng":75.7873,"r":120,"start":60,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"New Delhi, India","offBy":235,"confidence":85,"evidence":["retroflex 't' and 'd' sounds in 'roads' and 'periods'","monophthongal 'o' vowel in 'roam' and 'alone'","colloquial Hindi phrasing using 'mere ko' instead of 'mujhe'"],"title":"Gender Change For A Day | Street Interview | Jaipur | Praveer","author":"Praveer Tanwar"},"deck":"hindi-urdu","evalExclude":true,"source":{"who":"Praveer Tanwar","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=tZV_e58UDFk","note":"Gender Change For A Day | Street Interview | Jaipur | Praveer"}},
    
    {"id":"yt-520zmm5qVh0","kind":"yt","videoId":"520zmm5qVh0","label":"Hyderabad, India","lang":"Hindi–Urdu","lat":17.385,"lng":78.4867,"r":60,"start":99,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Hyderabad, Telangana, India","offBy":3,"confidence":85,"evidence":["Mentions Charminar and Irani Chai","Distinct Hyderabadi Hindi/Dakhni rhythm and intonation","Local street jargon and cadence typical of Old City Hyderabad"],"title":"Hyderabad on Being Hyderabadi","author":"BeingIndian"},"evalExclude":true,"source":{"who":"BeingIndian","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=520zmm5qVh0","note":"Hyderabad on Being Hyderabadi"}},
    
    {
      "id": "hindi-urdu-spoken-hindi-wikipedia-indo-european-language-",
      "label": "Delhi–Meerut Region, India",
      "lang": "hi",
      "url": "/clips/hindi-urdu/hindi-urdu-spoken-hindi-wikipedia-indo-european-language-.mp3",
      "lat": 28.6139,
      "lng": 77.209,
      "r": 150,
      "size": 1920775,
      "hint": "9m42s, verified direct file. Origin evidence is a dialect tag (Khariboli/North Indian standard) rather than a single named city, so treat the pin location as the broad Delhi–Meerut belt, not",
      "source": {
        "who": "Magicalsaumy, dual",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Hi-Hind-Europiya_bhaashaa_parivaar_part2.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6
    },
    {
      "id": "hindi-urdu-karachi-pakistan-urdu",
      "label": "Karachi, Pakistan",
      "lang": "Urdu",
      "url": "/clips/hindi-urdu/hindi-urdu-karachi-pakistan-urdu.mp3",
      "lat": 24.8607,
      "lng": 67.0011,
      "r": 120,
      "size": 615279,
      "wild": true,
      "hint": "A Deobandi scholar who resettled in the new port city after 1947 and built its most famous seminary, speaking on state radio.",
      "source": {
        "who": "Owais Al Qarni",
        "host": "Wikimedia Commons",
        "license": "CC0 (public domain)",
        "page": "https://commons.wikimedia.org/wiki/File:A_rare_Interview_of_Mufti_Muhammad_Shafi.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4
    },
    {
      "id": "hindi-urdu-mumbai-india-hindi-bambaiyya-adjacent",
      "label": "Mumbai, India",
      "lang": "Hindi (Bambaiyya-adjacent)",
      "url": "/clips/hindi-urdu/hindi-urdu-mumbai-india-hindi-bambaiyya-adjacent.mp3",
      "lat": 19.076,
      "lng": 72.8777,
      "r": 120,
      "size": 512879,
      "wild": true,
      "start": 28,
      "hint": "Bollywood's most legendary dance mistress, born on the very film sets she'd spend seventy years choreographing.",
      "source": {
        "who": "Interview by Devang Bhatt; uploaded by Nizil Shah",
        "host": "Wikimedia Commons",
        "license": "CC BY 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Saroj_Khan_Indian_Choreographer_voice_sample.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4
    },
    {
        "start": 40.5, "id": "hindi-urdu-mufti-abul-qasim-nomani-talk-on-darul-uloom-de",
      "label": "Varanasi, India",
      "lang": "ur",
      "url": "/clips/hindi-urdu/hindi-urdu-mufti-abul-qasim-nomani-talk-on-darul-uloom-de.mp3",
      "lat": 25.3176,
      "lng": 82.9739,
      "r": 120,
      "size": 1578466,
      "hint": "3m17s, verified direct file. Recorded in Urdu, which is the normal medium of instruction/address in Indian Deobandi seminaries, so an Indian speaker using Urdu here is expected, not a signal",
      "source": {
        "who": "Owais Bin Elias",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Abul_Kasim_Nomani.flac",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4
    }
  ],
  "portuguese": [
    {"id":"yt-69ZiYIUfCmw","kind":"yt","videoId":"69ZiYIUfCmw","label":"Luanda, Angola","lang":"Portuguese","lat":-8.839,"lng":13.2894,"r":150,"start":169,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Luanda, Angola","offBy":6,"confidence":95,"evidence":["the slang 'tali' used to mean thousands of Kwanzas","the word 'carrinha' used for a street food cart or van","the rhythmic, sing-song cadence typical of Luanda"],"title":"MOMENTOS NAS RUAS DE LUANDA #EP01","author":"Olhar Angolano"},"deck":"portuguese","evalExclude":true,"source":{"who":"Olhar Angolano","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=69ZiYIUfCmw","note":"MOMENTOS NAS RUAS DE LUANDA #EP01"}},
    {"id":"yt-KoqtgZTHhzc","kind":"yt","videoId":"KoqtgZTHhzc","label":"Recife, Brazil","lang":"Portuguese","lat":-8.0476,"lng":-34.877,"r":70,"start": 147,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Recife, Pernambuco, Brazil","offBy":0,"confidence":85,"evidence":["distinctive Northeastern Brazilian intonation and speed","use of regional filler terms like 'meu filho'","pronunciation of open vowels and cadence typical of Pernambuco"],"title":"Stand up Comedy sobre a Bilola de Brennand (Recife) - por Renato Bartolomeu","author":"Renato Bartolomeu"},"evalExclude":true,"source":{"who":"Renato Bartolomeu","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=KoqtgZTHhzc","note":"Stand up Comedy sobre a Bilola de Brennand (Recife) - por Renato Bartolomeu"}},
    {"id":"yt-MY7flvJA4Ds","kind":"yt","videoId":"MY7flvJA4Ds","label":"Salvador, Brazil","lang":"Portuguese","lat":-12.9777,"lng":-38.5016,"r":70,"start":58,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Salvador, Bahia, Brazil","offBy":0,"confidence":75,"evidence":["Brazilian Portuguese pronunciation with open mid-vowels","Palatalization of /t/ before /i/ in words like 'esporte'","Rhythmic cadence typical of Eastern and Northeastern Brazil"],"title":"entrevista basket de rua salvador  bahia","author":"Samir Tayrovitch"},"evalExclude":true,"source":{"who":"Samir Tayrovitch","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=MY7flvJA4Ds","note":"entrevista basket de rua salvador  bahia"}},
    {"id":"yt-GqUWj0x6OUc","kind":"yt","videoId":"GqUWj0x6OUc","label":"Salvador, Brazil","lang":"Portuguese","lat":-12.9777,"lng":-38.5016,"r":70,"start":30,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Salvador, Bahia, Brazil","offBy":1,"confidence":75,"evidence":["Northeastern Brazilian Portuguese cadence and open vowel qualities","Use of regional expressions like 'não deu conta' and double negation ('não... não')","Distinctive intonation pattern typical of Bahia and the wider Brazilian Northeast"],"title":"vídeo engraçado! eles não entenderam nada","author":"Escanio Oficial"},"evalExclude":true,"source":{"who":"Escanio Oficial","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=GqUWj0x6OUc","note":"vídeo engraçado! eles não entenderam nada"}},
    
    {
      "id": "portuguese-cape-verde-portuguese-cape-verde",
      "label": "Cape Verde",
      "lang": "Portuguese (Cape Verde)",
      "url": "/clips/portuguese/portuguese-cape-verde-portuguese-cape-verde.mp3",
      "lat": 16.8901,
      "lng": -24.9804,
      "r": 400,
      "size": 1834466,
      "wild": true,
      "start": 25,
      "hint": "A musician talking about art and travel; he left his islands for Lisbon decades ago but never lost the accent.",
      "source": {
        "who": "VOA Português",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:Um_artista_n%C3%A3o_morre,_um_artista_viaja_-_a_entrevista_com_Tito_Paris.webm",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
    {
      "id": "portuguese-malanje-angola-portuguese-angola",
      "label": "Malanje, Angola",
      "lang": "Portuguese (Angola)",
      "url": "/clips/portuguese/portuguese-malanje-angola-portuguese-angola.mp3",
      "lat": -9.5402,
      "lng": 16.341,
      "r": 400,
      "size": 1719319,
      "wild": true,
      "start": 66.5,
      "hint": "Residents of an Angolan province talking about living without running water or reliable power.",
      "source": {
        "who": "VOA Português",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:Angola-_Malanjinos_insatisfeitos_com_a_sua_situa%C3%A7%C3%A3o_social_-_VOA_Portugu%C3%AAs.webm",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4
    },
    {
      "id": "portuguese-mozambique-portuguese-mozambique",
      "label": "Mozambique",
      "lang": "Portuguese (Mozambique)",
      "url": "/clips/portuguese/portuguese-mozambique-portuguese-mozambique.mp3",
      "lat": -25.97,
      "lng": 32.57,
      "r": 450,
      "size": 1920775,
      "wild": true,
      "start": 63,
      "hint": "A diplomat explaining why his country's exporters aren't using a trade deal they're entitled to.",
      "source": {
        "who": "VOA Português",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:WIKITONGUES-_Cristiano_speaking_Barwe_and_Portuguese.webm",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -17.2
    },
    {
      "id": "portuguese-parana-brazil-portuguese-brazilian-parana",
      "label": "Paraná, Brazil",
      "lang": "Portuguese (Brazilian · Paraná)",
      "url": "/clips/portuguese/portuguese-parana-brazil-portuguese-brazilian-parana.mp3",
      "lat": -25.4284,
      "lng": -49.2733,
      "r": 250,
      "size": 1274610,
      "hint": "A volunteer reading the Portuguese Wikipedia article about rabbits · the accent is from the south of Brazil.",
      "source": {
        "who": "Deyvid Setti",
        "host": "Wikimedia Commons",
        "license": "CC BY 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Coelho_intro.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
    {
      "id": "portuguese-porto-alegre-brazil-portuguese-brazilian-gauch",
      "label": "Porto Alegre, Brazil",
      "lang": "Portuguese (Brazilian · Gaúcho / Rio Grande do Sul)",
      "url": "/clips/portuguese/portuguese-porto-alegre-brazil-portuguese-brazilian-gauch.mp3",
      "lat": -30.0346,
      "lng": -51.2177,
      "r": 120,
      "size": 431586,
      "hint": "Brazil's southernmost gaúcho capital · closer to Uruguay than to Rio, and it shows in the vowels.",
      "source": {
        "who": "Native-speaker recording credited to Russell Walker (learningportuguese.co.uk",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:Male,_Southern_Brazilian_(from_Porto_Alegre,_Rio_Grande_do_Sul).ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
    {
      "id": "portuguese-porto-portugal-portuguese-european-porto-north",
      "label": "Porto, Portugal",
      "lang": "Portuguese (European · Porto/North)",
      "url": "/clips/portuguese/portuguese-porto-portugal-portuguese-european-porto-north.mp3",
      "lat": 41.1579,
      "lng": -8.6291,
      "r": 120,
      "size": 1201676,
      "hint": "A self-published novelist reading his own book about a portuense falling for a Galician · he'd know, he IS a portuense.",
      "source": {
        "who": "Daniel Dias reading his own novel \"Amor entre um portuense e uma galega\"",
        "host": "Wikimedia Commons",
        "license": "CC0 (public domain)",
        "page": "https://commons.wikimedia.org/wiki/File:Amor_entre_um_portuense_e_uma_galega_de_Daniel_Dias_e_narrado_por_Daniel_Dias.wav",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "portuguese-rio-de-janeiro-brazil-portuguese-brazilian-car",
      "label": "Rio de Janeiro, Brazil",
      "lang": "Portuguese (Brazilian · Carioca)",
      "url": "/clips/portuguese/portuguese-rio-de-janeiro-brazil-portuguese-brazilian-car.mp3",
      "lat": -22.9068,
      "lng": -43.1729,
      "r": 120,
      "size": 1920775,
      "start": 5,
      "hint": "Reading Wikipedia deliberately in a carioca accent · listen for Rio's soft, hissy S's.",
      "source": {
        "who": "\"Eslavos da Ásia Menor versão RJ\" read by user \"Eduardo P\"",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Eslavos_da_%C3%81sia_Menor_vers%C3%A3o_RJ.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6
    },
    {
      "id": "portuguese-sao-paulo-brazil-portuguese-brazilian-sao-paul",
      "label": "São Paulo, Brazil",
      "lang": "Portuguese (Brazilian · São Paulo)",
      "url": "/clips/portuguese/portuguese-sao-paulo-brazil-portuguese-brazilian-sao-paul.mp3",
      "lat": -23.5505,
      "lng": -46.6333,
      "r": 120,
      "size": 1920775,
      "wild": true,
      "start": 73.5,
      "hint": "A USP bioinformatician and Wikimedian talking ethics and open science · Paulistano through and through.",
      "source": {
        "who": "Interview with Tiago Lubiana, recorded by user \"Clari reche\"",
        "host": "Wikimedia Commons",
        "license": "CC BY 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Entrevita_com_Tiago_Lubiana_sobre_bioinform%C3%A1tica_e_%C3%A9tica.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.7
    }
  ],
  "russian": [
    {"id":"yt-XMyubgtKLro","kind":"yt","videoId":"XMyubgtKLro","label":"Bishkek, Kyrgyzstan","lang":"Russian","lat":42.8746,"lng":74.5698,"r":120,"start":107,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Bishkek, Kyrgyzstan","offBy":0,"confidence":92,"evidence":["fluent Kyrgyz phrases like 'башка көптөгөн нерселер бар'","standard Russian spoken with a mild Central Asian cadence","the Kyrgyz question 'тамекиби же машина?'"],"title":"Опрос:Среди горожан о смоге..........","author":"ЦИМ"},"deck":"russian","evalExclude":true,"source":{"who":"ЦИМ","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=XMyubgtKLro","note":"Опрос:Среди горожан о смоге.........."}},
    {"id":"yt-cjHB4Wb_zqA","kind":"yt","videoId":"cjHB4Wb_zqA","label":"Bishkek, Kyrgyzstan","lang":"Russian","lat":42.8746,"lng":74.5698,"r":120,"start": 160,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Bishkek, Kyrgyzstan","offBy":0,"confidence":95,"evidence":["the soft, slightly fronted pronunciation of 'тридцать шесть'","the characteristic melodic rise and fall of Kyrgyz-influenced Russian","the natural, unhesitating use of the local term 'кыргызском'"],"title":"Опрос жителей Бишкека #3","author":"Azziaty"},"deck":"russian","evalExclude":true,"source":{"who":"Azziaty","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=cjHB4Wb_zqA","note":"Опрос жителей Бишкека #3"}},
    {"id":"yt-CHA19dT3Zps","kind":"yt","videoId":"CHA19dT3Zps","label":"Tashkent, Uzbekistan","lang":"Russian","lat":41.2995,"lng":69.2401,"r":120,"start":123,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Tashkent, Uzbekistan","offBy":1,"confidence":90,"evidence":["the use of the Uzbek word 'yaxshi' (яхши) meaning 'good'","the mention of '8 million' referring to Uzbek soum","the distinct Central Asian Russian accent with softer consonants"],"title":"Опрос: Сколько зарабатывают жители Ташкента","author":"Gazeta.uz: Новости Узбекистана"},"deck":"russian","evalExclude":true,"source":{"who":"Gazeta.uz: Новости Узбекистана","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=CHA19dT3Zps","note":"Опрос: Сколько зарабатывают жители Ташкента"}},
    {"id":"yt-oYxuj1dl_JY","kind":"yt","videoId":"oYxuj1dl_JY","label":"Chișinău, Moldova","lang":"Russian","lat":47.0105,"lng":28.8638,"r":100,"start":30,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Chisinau, Moldova","offBy":0,"confidence":95,"evidence":["they explicitly mention Moldova ('в Молдове')","they refer to the local currency 'lei' ('лей')","the slightly softened, rhythmic cadence of their Russian"],"title":"Опрос: с какими проблемами сталкиваются жители Молдовы?","author":"TV6 Moldova"},"deck":"russian","evalExclude":true,"source":{"who":"TV6 Moldova","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=oYxuj1dl_JY","note":"Опрос: с какими проблемами сталкиваются жители Молдовы?"}},
    {"id":"yt-BGymDdBJrM0","kind":"yt","videoId":"BGymDdBJrM0","label":"Chișinău, Moldova","lang":"Russian","lat":47.0105,"lng":28.8638,"r":100,"start":30,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Kyiv, Ukraine","offBy":401,"confidence":80,"evidence":["your 'g' in 'goda' and 'gde-to' is pronounced as a soft breathy 'h'","the final 'g' in 'uslug' is devoiced to a 'kh' sound","the rhythm and vowel flow are typical of Russian spoken in Ukraine"],"title":"Сколько жители Кишинева платят за аренду жилья? - Опрос Moldova Liberă","author":"Moldova Liberă"},"deck":"russian","evalExclude":true,"source":{"who":"Moldova Liberă","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=BGymDdBJrM0","note":"Сколько жители Кишинева платят за аренду жилья? - Опрос Moldova Liberă"}},
    {"id":"yt-v6SOFiVntd4","kind":"yt","videoId":"v6SOFiVntd4","label":"Karaganda, Kazakhstan","lang":"Russian","lat":49.8047,"lng":73.1094,"r":130,"start":49,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Astana, Kazakhstan","offBy":192,"confidence":85,"evidence":["use of the Kazakh administrative term 'akim'","slightly even, syllable-timed rhythm in Russian speech","distinctly clear, non-reduced unstressed vowels"],"title":"28% жителей Караганды прошли перепись населения он-лайн.","author":"ТК 5 канал Караганда"},"deck":"russian","evalExclude":true,"source":{"who":"ТК 5 канал Караганда","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=v6SOFiVntd4","note":"28% жителей Караганды прошли перепись населения он-лайн."}},
    {"id":"yt-XdlzL4hPqjE","kind":"yt","videoId":"XdlzL4hPqjE","label":"Tallinn, Estonia","lang":"Russian","lat":59.437,"lng":24.7536,"r":100,"start": 94,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.5-flash","heard":"Tallinn, Estonia","offBy":0,"confidence":85,"evidence":["you explicitly mention Estonia as your home","the slightly elongated vowels typical of Baltic Russian","the soft, clear pronunciation of Russian consonants"],"title":"Уличный опрос: чувствуют ли жители Таллинна себя в безопасности","author":"Кофе+"},"deck":"russian","evalExclude":true,"source":{"who":"Кофе+","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=XdlzL4hPqjE","note":"Уличный опрос: чувствуют ли жители Таллинна себя в безопасности"}},
    {"id":"yt-gOVe3869tX8","kind":"yt","videoId":"gOVe3869tX8","label":"Tbilisi, Georgia","lang":"Russian","lat":41.7151,"lng":44.8271,"r":70,"start": 349,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Tbilisi, Georgia","offBy":0,"confidence":85,"evidence":["distinctive Georgian intonation contour in Russian","slightly aspirated/glottalized voiceless stops","characteristic cadence and pitch movement on phrase endings"],"title":"Притворился УКРАИНЦЕМ, чтобы узнать, как относятся к РУССКИМ в Грузии / Тбилиси Опрос","author":"Дима Путешествует"},"evalExclude":true,"source":{"who":"Дима Путешествует","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=gOVe3869tX8","note":"Притворился УКРАИНЦЕМ, чтобы узнать, как относятся к РУССКИМ в Грузии / Тбилиси Опрос"}},
    
    
    {"id":"yt-KYCzYHQgulE","kind":"yt","videoId":"KYCzYHQgulE","label":"Odesa, Ukraine","lang":"Russian","lat":46.4825,"lng":30.7233,"r":70,"start": 145,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Northern Ukraine","offBy":493,"confidence":85,"evidence":["Speaker states they are from Northern Ukraine","Surzhyk influence with Ukrainian word choices like \"тому\"","Voiced glottal fricative [ɦ] typical of Ukrainian Russian"],"title":"Опрос \"Как война изменила вашу жизнь?\" Одесса. 20.04.2022","author":"Думская Нет"},"evalExclude":true,"source":{"who":"Думская Нет","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=KYCzYHQgulE","note":"Опрос \"Как война изменила вашу жизнь?\" Одесса. 20.04.2022"}},
    
    
    {"id":"yt-gRaokqJX1c8","kind":"yt","videoId":"gRaokqJX1c8","label":"Almaty, Kazakhstan","lang":"Russian","lat":43.222,"lng":76.8512,"r":70,"start": 161,"gain":100,"hint":"Streamed from YouTube — the creator gets the view.","gate":{"model":"gemini-3.6-flash","heard":"Almaty, Kazakhstan","offBy":6,"confidence":85,"evidence":["Mention of Almaty ('в Алма-Ате')","Kazakhstani Russian vowel cadence and intonation","Urban Kazakh Russian speech mannerisms and lexical choices"],"title":"Опрос: Хочет ли молодежь уехать из Казахстана","author":"KOCHETKOV reporter"},"evalExclude":true,"source":{"who":"KOCHETKOV reporter","host":"YouTube","license":"Streamed from YouTube — the creator keeps the view","page":"https://www.youtube.com/watch?v=gRaokqJX1c8","note":"Опрос: Хочет ли молодежь уехать из Казахстана"}},
    {
      "id": "russian-moscow-russia-russian-moscow",
      "label": "Moscow, Russia",
      "lang": "Russian (Moscow)",
      "url": "/clips/russian/russian-moscow-russia-russian-moscow.mp3",
      "lat": 55.7558,
      "lng": 37.6173,
      "r": 120,
      "size": 689676,
      "wild": true,
      "hint": "A physicist muses about why nature's fundamental constants have such odd ratios - his whole career, from schoolboy to academician, never left the capital.",
      "source": {
        "who": "Valery Rubakov, recorded by the Oral History Foundation & Lomonosov MSU Science Library",
        "host": "Wikimedia Commons",
        "license": "CC0 (public domain)",
        "page": "https://commons.wikimedia.org/wiki/File:Rubakov_Valeriy_Anatolyevich.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    }
    ]
};
