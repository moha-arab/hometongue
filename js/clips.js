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
      "lat": 32.5,
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
      "lat": 15.5,
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
    {
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
      "lat": -4,
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
      "lat": -6.2,
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
      "lat": 9.03,
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
    {
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
      "lat": 50.9,
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
      "lufs": -19.5
    },
    {
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
      "lat": 41.9,
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
    {
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
    {
      "id": "wild-amritsar-punjab-india",
      "label": "Amritsar / Punjab, India",
      "lang": "English",
      "url": "/clips/accents/wild-amritsar-punjab-india.mp3",
      "lat": 31.634,
      "lng": 74.8723,
      "r": 800,
      "size": 1186839,
      "wild": true,
      "hint": "Indian PM addressing the US Congress, 2.5min. Note: born in pre-Partition Punjab (now Pakistan), raised in Indian Punjab",
      "start": 97,
      "source": {
        "who": "US Congress joint session recording (2005",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:Manmohan_Singh_voice.ogg",
        "note": ""
      },
      "lufs": -16.4,
      "year": 2005
    },
    {
      "id": "wild-boston-massachusetts-usa",
      "label": "Boston, Massachusetts, USA",
      "lang": "English",
      "url": "/clips/accents/wild-boston-massachusetts-usa.mp3",
      "lat": 42.3601,
      "lng": -71.0589,
      "r": 120,
      "size": 1920775,
      "wild": true,
      "hint": "1961 speech, the Boston non-rhotic 'vigah' is unmistakable — but the voice is world-famous, may be too easy",
      "source": {
        "who": "John F. Kennedy Presidential Library & Museum",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:JFK_inaugural_address.ogg",
        "note": ""
      },
      "lufs": -15.6,
      "year": 1961
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
      "start": 9,
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
      "id": "wild-huddersfield-west-yorkshire-england",
      "label": "Huddersfield, West Yorkshire, England",
      "lang": "English",
      "url": "/clips/accents/wild-huddersfield-west-yorkshire-england.mp3",
      "lat": 53.6458,
      "lng": -1.785,
      "r": 80,
      "size": 226577,
      "wild": true,
      "hint": "TV inventor interviewed at home, 28s of strong Yorkshire vowels",
      "source": {
        "who": "Interview clip by Christian Payne (Documentally",
        "host": "Wikimedia Commons",
        "license": "CC BY 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Wilf%27_Lunn_voice_sample.wav",
        "note": ""
      },
      "lufs": -16.6,
      "year": 2011
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
      "start": 111,
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
      "start": 16,
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
      "id": "wild-liverpool-england",
      "label": "Liverpool, England",
      "lang": "English",
      "url": "/clips/accents/wild-liverpool-england.mp3",
      "lat": 53.4084,
      "lng": -2.9916,
      "r": 60,
      "size": 268762,
      "wild": true,
      "hint": "Comedian reminiscing about school; 33s interview speech",
      "source": {
        "who": "BBC Radio 4 Desert Island Discs (24 June 2012",
        "host": "Wikimedia Commons",
        "license": "CC BY 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:John_bishop_bbc_radio4_desert_island_discs_24_06_2012.flac",
        "note": ""
      },
      "lufs": -16.6,
      "year": 2012
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
      "start": 25,
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
      "start": 14,
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
      "id": "wild-mvezo-eastern-cape-south-africa",
      "label": "Mvezo / Eastern Cape, South Africa",
      "lang": "English",
      "url": "/clips/accents/wild-mvezo-eastern-cape-south-africa.mp3",
      "lat": -31.93,
      "lng": 28.48,
      "r": 600,
      "size": 1920775,
      "wild": true,
      "hint": "10.7min speech; unmistakable cadence — world-famous voice, may be too easy",
      "start": 31,
      "source": {
        "who": "White House recording via Clinton Presidential Library",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:Nelson_Mandela_voice.ogg",
        "note": ""
      },
      "lufs": -16.6,
      "year": 1993
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
      "start": 33,
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
      "id": "accents-new-zealand-english-new-zealand",
      "label": "New Zealand",
      "lang": "English (New Zealand)",
      "url": "/clips/accents/accents-new-zealand-english-new-zealand.mp3",
      "lat": -40.9,
      "lng": 174.9,
      "r": 450,
      "size": 1426661,
      "wild": true,
      "start": 120,
      "hint": "A former head of government giving a graduation address about truth and democracy.",
      "source": {
        "who": "Harvard University",
        "host": "Wikimedia Commons",
        "license": "CC BY 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Jacinda_Ardern-_Harvard_Graduation_2022_Speech-_%22Democracy_is_Fragile%22.webm",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.7,
      "year": 2022
    },
    {
      "id": "accents-nigeria-nigerian-pidgin",
      "label": "Nigeria",
      "lang": "Nigerian Pidgin",
      "url": "/clips/accents/accents-nigeria-nigerian-pidgin.mp3",
      "lat": 9.08,
      "lng": 8.68,
      "r": 450,
      "size": 1612112,
      "wild": true,
      "start": 150,
      "hint": "Nigerian Pidgin, spoken the way it actually gets spoken.",
      "year": 2024,
      "source": {
        "who": "Wikitongues oral histories project",
        "host": "Wikimedia Commons",
        "license": "CC0 (public domain)",
        "page": "https://commons.wikimedia.org/wiki/File:Tochi_speaking_Nigerian_Pidgin.webm",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6
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
      "start": 30,
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
      "id": "wild-sarnia-milton-ontario-canada",
      "label": "Sarnia / Milton, Ontario, Canada",
      "lang": "English",
      "url": "/clips/accents/wild-sarnia-milton-ontario-canada.mp3",
      "lat": 43.5183,
      "lng": -79.8774,
      "r": 500,
      "size": 1920906,
      "wild": true,
      "hint": "Live unscripted Q&A downlink, 24:18 mp3; opening minutes may include Canadian event hosts (also Ontario voices) before/between Hadfield's long answers. All-English event.",
      "start": 103,
      "source": {
        "who": "NASA TV, 'Space Station's Hadfield Connects with Canadian Students', Jan 30, 2013, via nasa_tv collection (item nasa_tv-Space_Station_s_Hadfield_Connects_with_Canadian_Students). NASA TV production",
        "host": "Internet Archive",
        "license": "US government work (public domain)",
        "page": "",
        "note": ""
      },
      "lufs": -16.7,
      "year": 2013
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
      "start": 110,
      "hint": "Broad West Riding — the vowels do the work.",
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
      "id": "wild-texas-hill-country-stonewall-usa",
      "label": "Texas Hill Country (Stonewall), USA",
      "lang": "English",
      "url": "/clips/accents/wild-texas-hill-country-stonewall-usa.mp3",
      "lat": 30.2418,
      "lng": -98.4439,
      "r": 400,
      "size": 1920880,
      "wild": true,
      "hint": "Unscripted phone conversation, 7:08; LBJ does most of the talking but the other party (Arthur Goldberg, Chicago) also speaks.",
      "source": {
        "who": "LBJ White House telephone recordings, tape 6311.01 (Nov 1963), LBJ Presidential Library via Miller Center 'presidential_recordings' collection on (item lbj631101). U.S. federal government recording",
        "host": "Internet Archive",
        "license": "public domain",
        "page": "",
        "note": ""
      },
      "lufs": -16.1,
      "year": 1963
    },
    {
      "id": "wild-the-bronx-new-york-city-usa",
      "label": "The Bronx, New York City, USA",
      "lang": "English",
      "url": "/clips/accents/wild-the-bronx-new-york-city-usa.mp3",
      "lat": 40.8448,
      "lng": -73.8648,
      "r": 100,
      "size": 1920775,
      "wild": true,
      "hint": "Judge telling her life story to the Senate; 7min, NY accent; skip the first ~30s of thank-yous",
      "start": 11,
      "source": {
        "who": "US Senate Judiciary Committee hearing recording (2009",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:Sonia_Sotomayor_Opening_Statement_to_the_Senate_Judiciary_Committee.ogg",
        "note": ""
      },
      "lufs": -16.9,
      "year": 2009
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
      "start": 23,
      "source": {
        "who": "Oral history interview by A.-K. D",
        "host": "Wikimedia Commons",
        "license": "CC0 (public domain)",
        "page": "https://commons.wikimedia.org/wiki/File:2024-09-16_Patrick_Lalor_Ladywell.opus",
        "note": ""
      },
      "lufs": -16.6,
      "year": 2024
    },
    {
      "id": "wild-toronto-canada",
      "label": "Toronto, Canada",
      "lang": "English",
      "url": "/clips/accents/wild-toronto-canada.mp3",
      "lat": 43.6532,
      "lng": -79.3832,
      "r": 400,
      "size": 1920775,
      "wild": true,
      "hint": "PM speaking at Davos; 6.5min, standard Canadian English",
      "start": 4,
      "source": {
        "who": "World Economic Forum 2012 recording",
        "host": "Wikimedia Commons",
        "license": "CC BY 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Stephen_Harper_voice.ogg",
        "note": ""
      },
      "lufs": -18.8,
      "year": 2012
    },
    {
      "id": "accents-wales-english-welsh",
      "label": "Wales",
      "lang": "English (Welsh)",
      "url": "/clips/accents/accents-wales-english-welsh.mp3",
      "lat": 52.13,
      "lng": -3.78,
      "r": 200,
      "size": 606808,
      "wild": true,
      "hint": "A first minister speaking at a day of reflection for those lost to the pandemic.",
      "source": {
        "who": "Welsh Government",
        "host": "Wikimedia Commons",
        "license": "Open Government Licence v3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Mark_Drakeford%27s_speech_on_Welsh_National_Day_of_Reflection.webm",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -17,
      "year": 2021
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
      "hint": "Local radio from Abu Dhabi — ARCADE corpus.",
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
      "id": "ar-6158",
      "label": "Ajman, UAE",
      "lang": "Arabic",
      "url": "/clips/ar/ar-6158.mp3",
      "lat": 25.41,
      "lng": 55.44,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Ajman — ARCADE corpus.",
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
      "id": "ar-3384",
      "label": "Aleppo, Syria",
      "lang": "Arabic",
      "url": "/clips/ar/ar-3384.mp3",
      "lat": 36.2,
      "lng": 37.13,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Aleppo — ARCADE corpus.",
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
      "id": "ar-882",
      "label": "Alexandria, Egypt",
      "lang": "Arabic",
      "url": "/clips/ar/ar-882.mp3",
      "lat": 31.2,
      "lng": 29.92,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Alexandria — ARCADE corpus.",
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
      "id": "ar-2082",
      "label": "Algiers, Algeria",
      "lang": "Arabic",
      "url": "/clips/ar/ar-2082.mp3",
      "lat": 36.75,
      "lng": 3.06,
      "r": 350,
      "size": 240835,
      "hint": "Local radio from Algiers — ARCADE corpus.",
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
      "hint": "Local radio from Amman — ARCADE corpus.",
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
      "hint": "Local radio from Annaba — ARCADE corpus.",
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
      "hint": "Local radio from Baghdad — ARCADE corpus.",
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
      "hint": "Local radio from Basra — ARCADE corpus.",
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
      "hint": "Local radio from Batna — ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -19.8
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
      "hint": "Local radio from Beirut — ARCADE corpus.",
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
      "hint": "Local radio from Benghazi — ARCADE corpus.",
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
      "hint": "Local radio from Blida — ARCADE corpus.",
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
      "hint": "Local radio from Cairo — ARCADE corpus.",
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
      "hint": "Local radio from Casablanca — ARCADE corpus.",
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
      "hint": "Local radio from Constantine — ARCADE corpus.",
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
      "id": "ar-2278",
      "label": "Damascus, Syria",
      "lang": "Arabic",
      "url": "/clips/ar/ar-2278.mp3",
      "lat": 33.51,
      "lng": 36.29,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Damascus — ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16
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
      "hint": "Local radio from Djelfa — ARCADE corpus.",
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
      "hint": "Local radio from Dubai — ARCADE corpus.",
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
      "hint": "Local radio from El Obeid — ARCADE corpus.",
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
      "hint": "Local radio from Fes — ARCADE corpus.",
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
      "hint": "Local radio from Gaza — ARCADE corpus.",
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
      "hint": "Local radio from Hebron — ARCADE corpus.",
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
      "hint": "Local radio from Irbid — ARCADE corpus.",
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
      "hint": "Local radio from Jeddah — ARCADE corpus.",
      "source": {
        "who": "Local radio broadcast",
        "host": "ARCADE corpus (RIOTU Lab)",
        "license": "CC BY 4.0",
        "page": "https://huggingface.co/datasets/riotu-lab/ARCADE-full",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -19.7
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
      "hint": "Local radio from Jerusalem — ARCADE corpus.",
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
      "hint": "Local radio from Kuwait City — ARCADE corpus.",
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
      "hint": "Local radio from Manama — ARCADE corpus.",
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
      "hint": "Local radio from Muscat — ARCADE corpus.",
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
      "hint": "Local radio from Nablus — ARCADE corpus.",
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
      "hint": "Local radio from Omdurman — ARCADE corpus.",
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
      "hint": "Local radio from Oran — ARCADE corpus.",
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
      "hint": "Local radio from Port Sudan — ARCADE corpus.",
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
      "hint": "Local radio from Rabat — ARCADE corpus.",
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
      "id": "ar-1650",
      "label": "Ramallah, Palestine",
      "lang": "Arabic",
      "url": "/clips/ar/ar-1650.mp3",
      "lat": 31.9,
      "lng": 35.2,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Ramallah — ARCADE corpus.",
      "start": 5,
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
      "id": "ar-2787",
      "label": "Riyadh, Saudi Arabia",
      "lang": "Arabic",
      "url": "/clips/ar/ar-2787.mp3",
      "lat": 24.71,
      "lng": 46.68,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Riyadh — ARCADE corpus.",
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
      "id": "ar-3479",
      "label": "Sanaa, Yemen",
      "lang": "Arabic",
      "url": "/clips/ar/ar-3479.mp3",
      "lat": 15.37,
      "lng": 44.19,
      "r": 350,
      "size": 240788,
      "hint": "Local radio from Sanaa — ARCADE corpus.",
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
      "id": "ar-4464",
      "label": "Setif, Algeria",
      "lang": "Arabic",
      "url": "/clips/ar/ar-4464.mp3",
      "lat": 36.19,
      "lng": 5.41,
      "r": 350,
      "size": 240835,
      "hint": "Local radio from Setif — ARCADE corpus.",
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
      "hint": "Local radio from Sharjah — ARCADE corpus.",
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
      "hint": "Local radio from Taiz — ARCADE corpus.",
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
      "hint": "Local radio from Tangier — ARCADE corpus.",
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
      "hint": "Local radio from Tripoli — ARCADE corpus.",
      "start": 9,
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
      "hint": "Local radio from Tunis — ARCADE corpus.",
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
      "hint": "Local radio from Wad Medani — ARCADE corpus.",
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
      "start": 29,
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
      "start": 91,
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
      "start": 56,
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
      "start": 30,
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
      "start": 38,
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
    {
      "id": "spanish-seville-andalusia-spain-spanish-andalusian-spa",
      "label": "Andalusia, Spain",
      "lang": "Spanish (Andalusian, Spain)",
      "url": "/clips/spanish/spanish-seville-andalusia-spain-spanish-andalusian-spa.mp3",
      "lat": 37.5,
      "lng": -4.8,
      "r": 260,
      "size": 1920775,
      "start": 92,
      "hint": "A leisurely read-through of Andalusia's own history, in Andalusian.",
      "source": {
        "who": "Loqu",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Es-Historia_de_Andaluc%C3%ADa-article.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.8
    },
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
      "lat": 22,
      "lng": -101,
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
      "lat": 22,
      "lng": -101,
      "r": 500,
      "size": 772432,
      "hint": "NOT the already-used Mexican medical-article reading — this is a different reader/topic. Short (1:36) but clean. Country-level tag only, no specific city, pinned at Mexico City with wide rad",
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
      "hint": "Checked full text on Wikisource: the story names no real places at all (only generic 'sierra,' 'valle,' 'mi terruño') — no Uruguay or Montevideo mention. Archival 1946 radio recording, PD un",
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
      "start": 56,
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
      "hint": "Classic Golden Age theatre monologue — geography-free content by nature, no Spain/Madrid references. Only regional-category documentation (no specific city), pinned at Madrid with wide radiu",
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
    {
      "id": "chinese-chengdu-china-mandarin-sichuanese-chengdu-dial",
      "label": "Chengdu, China",
      "lang": "Mandarin (Sichuanese, Chengdu dialect)",
      "url": "/clips/chinese/chinese-chengdu-china-mandarin-sichuanese-chengdu-dial.mp3",
      "lat": 30.5728,
      "lng": 104.0668,
      "r": 120,
      "size": 265030,
      "hint": "Just over half a minute — the same fable linguists use worldwide to sample accents, this time in full Chengdu Sichuanese.",
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
      "id": "chinese-foshan-china-cantonese-guangdong-pearl-river-d",
      "label": "Foshan, China",
      "lang": "Cantonese (Guangdong/Pearl River Delta)",
      "url": "/clips/chinese/chinese-foshan-china-cantonese-guangdong-pearl-river-d.mp3",
      "lat": 23.1667,
      "lng": 112.8944,
      "r": 120,
      "size": 1920867,
      "wild": true,
      "hint": "FLAG FOR YOUR OWN REVIEW before using: a real 1939 radio address by a major, politically controversial 20th-century Chinese figure (led the WWII-era Japanese-collaborationist government from",
      "source": {
        "who": "China Broadcasting Corporation recording (1939), \"兩種懷疑心理之解釋\" (Wang Jingwei, Cantonese), term expired",
        "host": "Wikimedia Commons",
        "license": "public domain",
        "page": "https://commons.wikimedia.org/wiki/File:%E5%85%A9%E7%A8%AE%E6%87%B7%E7%96%91%E5%BF%83%E7%90%86%E4%B9%8B%E8%A7%A3%E9%87%8B_%E6%B1%AA%E7%B2%BE%E8%A1%9B_%E7%B2%B5%E8%AA%9E.mp3",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5,
      "year": 1939
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
      "start": 23,
      "hint": "Two grandparents genuinely reminiscing, not reading a script — pure Southwest China drawl, a thousand km from the capital.",
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
      "id": "chinese-nanyang-china-zhongyuan-mandarin-henan",
      "label": "Nanyang, China",
      "lang": "Zhongyuan Mandarin (Henan)",
      "url": "/clips/chinese/chinese-nanyang-china-zhongyuan-mandarin-henan.mp3",
      "lat": 33,
      "lng": 112.53,
      "r": 260,
      "size": 1743978,
      "wild": true,
      "start": 138,
      "hint": "A Wikitongues speaker talking about their own life.",
      "source": {
        "who": "Wikitongues",
        "host": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "page": "",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6
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
      "start": 33,
      "hint": "Tagged simply 'zh-tw' by the reader — softer retroflexes and no erhua is the giveaway that this is Taiwan Guoyu, not mainland Mandarin.",
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
      "id": "chinese-taiwan-mandarin-good-cop-bad-dog-tv-episode-sp",
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
    {
      "id": "hindi-urdu-rajiv-dixit-aitihasik-bhulein-historical-mista",
      "label": "Aligarh, India",
      "lang": "hi",
      "url": "/clips/hindi-urdu/hindi-urdu-rajiv-dixit-aitihasik-bhulein-historical-mista.mp3",
      "lat": 27.8974,
      "lng": 78.088,
      "r": 250,
      "size": 1920775,
      "wild": true,
      "hint": "4m48s, verified direct file, confirmed via Archive.org metadata API (exact length/size). This is the short 5th installment of a longer numbered lecture, so it picks up mid-argument.",
      "source": {
        "who": "Rajiv Dixit lecture recording",
        "host": "Internet Archive",
        "license": "CC0 (public domain)",
        "page": "https://archive.org/details/RajivDixitAudioLecturesConvertInHindiTextSoftCopy",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.4
    },
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
      "start": 9,
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
      "id": "hindi-urdu-mufti-abul-qasim-nomani-talk-on-darul-uloom-de",
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
      "start": 53,
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
      "start": 28,
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
      "start": 71,
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
      "lang": "Portuguese (Brazilian — Paraná)",
      "url": "/clips/portuguese/portuguese-parana-brazil-portuguese-brazilian-parana.mp3",
      "lat": -25.4284,
      "lng": -49.2733,
      "r": 250,
      "size": 1274610,
      "hint": "A volunteer reading the Portuguese Wikipedia article about rabbits — the accent is from the south of Brazil.",
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
      "lang": "Portuguese (Brazilian — Gaúcho / Rio Grande do Sul)",
      "url": "/clips/portuguese/portuguese-porto-alegre-brazil-portuguese-brazilian-gauch.mp3",
      "lat": -30.0346,
      "lng": -51.2177,
      "r": 120,
      "size": 431586,
      "hint": "Brazil's southernmost gaúcho capital — closer to Uruguay than to Rio, and it shows in the vowels.",
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
      "lang": "Portuguese (European — Porto/North)",
      "url": "/clips/portuguese/portuguese-porto-portugal-portuguese-european-porto-north.mp3",
      "lat": 41.1579,
      "lng": -8.6291,
      "r": 120,
      "size": 1201676,
      "hint": "A self-published novelist reading his own book about a portuense falling for a Galician — he'd know, he IS a portuense.",
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
      "lang": "Portuguese (Brazilian — Carioca)",
      "url": "/clips/portuguese/portuguese-rio-de-janeiro-brazil-portuguese-brazilian-car.mp3",
      "lat": -22.9068,
      "lng": -43.1729,
      "r": 120,
      "size": 1920775,
      "start": 5,
      "hint": "Reading Wikipedia deliberately in a carioca accent — listen for Rio's soft, hissy S's.",
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
      "lang": "Portuguese (Brazilian — São Paulo)",
      "url": "/clips/portuguese/portuguese-sao-paulo-brazil-portuguese-brazilian-sao-paul.mp3",
      "lat": -23.5505,
      "lng": -46.6333,
      "r": 120,
      "size": 1920775,
      "wild": true,
      "start": 33,
      "hint": "A USP bioinformatician and Wikimedian talking ethics and open science — Paulistano through and through.",
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
    {
      "id": "russian-butka-russia-russian-ural-sverdlovsk",
      "label": "Butka, Russia",
      "lang": "Russian (Ural / Sverdlovsk)",
      "url": "/clips/russian/russian-butka-russia-russian-ural-sverdlovsk.mp3",
      "lat": 56.85,
      "lng": 63.65,
      "r": 150,
      "size": 1920775,
      "start": 26,
      "hint": "This is Yeltsin's famous 'I am tired, I am leaving' resignation address from 31 December 1999 - a scripted TV speech, but the man reading it was a Urals village kid who studied construction ",
      "source": {
        "who": "Press Service of the President of Russia / kremlin.ru",
        "host": "Wikimedia Commons",
        "license": "CC BY 4.0",
        "page": "https://commons.wikimedia.org/wiki/File:%D0%91%D0%BE%D1%80%D0%B8%D1%81_%D0%9D%D0%B8%D0%BA%D0%BE%D0%BB%D0%B0%D0%B5%D0%B2%D0%B8%D1%87_%D0%95%D0%BB%D1%8C%D1%86%D0%B8%D0%BD_%D0%9D%D0%BE%D0%B2%D0%BE%D0%B3%D0%BE%D0%B4%D0%BD%D0%B5%D0%B5_%D0%BE%D0%B1%D1%80%D0%B0%D1%89%D0%B5%D0%BD%D0%B8%D0%B5_%D0%BA_%D0%BD%D0%B0%D1%80%D0%BE%D0%B4%D1%83_1999_%D0%B3.ogg",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.6,
      "year": 1999
    },
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
    },
    {
      "id": "russian-privolnoye-russia-russian-southern-russia-stav",
      "label": "Privolnoye, Russia",
      "lang": "Russian (Southern Russia / Stavropol accent)",
      "url": "/clips/russian/russian-privolnoye-russia-russian-southern-russia-stav.mp3",
      "lat": 45.75,
      "lng": 43.05,
      "r": 120,
      "size": 294496,
      "wild": true,
      "hint": "The last Soviet leader shares a laugh about getting older on the radio - before the Kremlin, he was a farm-boy on the southern steppe, and you can still hear it in his vowels.",
      "source": {
        "who": "Echo of Moscow radio program",
        "host": "Wikimedia Commons",
        "license": "CC BY 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Mihail_Gorbachev_voice.oga",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -17.6
    },
    {
      "id": "russian-saint-petersburg-russia-russian-st-petersburg-",
      "label": "Saint Petersburg, Russia",
      "lang": "Russian (St Petersburg / Leningrad)",
      "url": "/clips/russian/russian-saint-petersburg-russia-russian-st-petersburg-.mp3",
      "lat": 59.9311,
      "lng": 30.3609,
      "r": 120,
      "size": 269627,
      "wild": true,
      "hint": "A two-time-flown cosmonaut jokes about crew fatigue on the Salyut stations - he trained as an engineer in the city that was called Leningrad when he was born there.",
      "source": {
        "who": "Echo of Moscow radio program",
        "host": "Wikimedia Commons",
        "license": "CC BY 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Georgij_Grechko_voice.oga",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    },
    {
      "id": "russian-zima-russia-russian-siberia-irkutsk",
      "label": "Zima, Russia",
      "lang": "Russian (Siberia / Irkutsk)",
      "url": "/clips/russian/russian-zima-russia-russian-siberia-irkutsk.mp3",
      "lat": 53.9167,
      "lng": 102.05,
      "r": 120,
      "size": 384148,
      "wild": true,
      "hint": "This Nobel-nominated poet's whole public image was built around his Siberian hometown - a railway station literally named 'Winter'.",
      "source": {
        "who": "Echo of Moscow radio program",
        "host": "Wikimedia Commons",
        "license": "CC BY 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Evgenij_Evtushenko_voice.oga",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.7
    },
    {
      "id": "russian-zlatoust-russia-russian-ural-chelyabinsk",
      "label": "Zlatoust, Russia",
      "lang": "Russian (Ural / Chelyabinsk)",
      "url": "/clips/russian/russian-zlatoust-russia-russian-ural-chelyabinsk.mp3",
      "lat": 55.1706,
      "lng": 59.6569,
      "r": 120,
      "size": 274225,
      "wild": true,
      "hint": "The 12th World Chess Champion weighs in on computers at the board - he first learned the game at a steelworks club in a Ural mountain town.",
      "source": {
        "who": "Echo of Moscow radio program",
        "host": "Wikimedia Commons",
        "license": "CC BY 3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Anatolij_Karpov_voice.oga",
        "note": "trimmed and re-encoded for the game"
      },
      "lufs": -16.5
    }
  ]
};
