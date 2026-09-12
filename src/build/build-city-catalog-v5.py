import json
from pathlib import Path
raw='''
FJI|Suva;Lautoka;Nadi;Labasa;Ba;Levuka
TZA|Dar es Salaam;Dodoma;Mwanza;Arusha;Mbeya;Zanzibar City
ESH|Laayoune;Dakhla;Smara;Boujdour
KAZ|Almaty;Astana;Shymkent;Karaganda;Aktobe;Atyrau
UZB|Tashkent;Samarkand;Bukhara;Namangan;Andijan;Nukus
PNG|Port Moresby;Lae;Mount Hagen;Madang;Goroka;Kokopo
IDN|Jakarta;Surabaya;Bandung;Medan;Makassar;Semarang
ARG|Buenos Aires;Córdoba;Rosario;Mendoza;La Plata;Salta
CHL|Santiago;Valparaíso;Concepción;Antofagasta;Temuco;Puerto Montt
COD|Kinshasa;Lubumbashi;Mbuji-Mayi;Kisangani;Goma;Bukavu
SOM|Mogadishu;Kismayo;Baidoa;Beledweyne;Garowe;Bosaso
KEN|Nairobi;Mombasa;Kisumu;Nakuru;Eldoret;Thika
SDN|Khartoum;Omdurman;Port Sudan;Kassala;El Obeid;Nyala
TCD|N'Djamena;Moundou;Sarh;Abéché;Kélo;Doba
HTI|Port-au-Prince;Cap-Haïtien;Gonaïves;Les Cayes;Jacmel;Jérémie
DOM|Santo Domingo;Santiago de los Caballeros;La Romana;San Pedro de Macorís;San Francisco de Macorís;Puerto Plata
RUS|Moscow;Saint Petersburg;Novosibirsk;Yekaterinburg;Kazan;Vladivostok
BHS|Nassau;Freeport;Marsh Harbour;George Town
FLK|Stanley;Goose Green;Darwin;Port Howard;Fox Bay;Port San Carlos
NOR|Oslo;Bergen;Trondheim;Stavanger;Tromsø;Kristiansand
GRL|Nuuk;Sisimiut;Ilulissat;Qaqortoq;Aasiaat;Tasiilaq
ATF|Port-aux-Français;Alfred-Faure;Martin-de-Viviès
TLS|Dili;Baucau;Maliana;Suai;Lospalos;Liquiçá
ZAF|Johannesburg;Cape Town;Durban;Pretoria;Gqeberha;Bloemfontein
LSO|Maseru;Teyateyaneng;Mafeteng;Hlotse;Mohale's Hoek;Quthing
MEX|Mexico City;Guadalajara;Monterrey;Puebla;Tijuana;Mérida
URY|Montevideo;Salto;Paysandú;Las Piedras;Rivera;Maldonado
BRA|São Paulo;Rio de Janeiro;Brasília;Salvador;Belo Horizonte;Manaus
BOL|La Paz;Santa Cruz de la Sierra;Cochabamba;Sucre;Oruro;Potosí
PER|Lima;Arequipa;Trujillo;Chiclayo;Cusco;Iquitos
COL|Bogotá;Medellín;Cali;Barranquilla;Cartagena;Bucaramanga
PAN|Panama City;Colón;David;Santiago;Chitré;La Chorrera
CRI|San José;Alajuela;Cartago;Heredia;Puntarenas;Limón
NIC|Managua;León;Masaya;Matagalpa;Chinandega;Granada
HND|Tegucigalpa;San Pedro Sula;La Ceiba;Choluteca;Comayagua;Puerto Cortés
SLV|San Salvador;Santa Ana;San Miguel;Sonsonate;Santa Tecla;Usulután
GTM|Guatemala City;Quetzaltenango;Escuintla;Cobán;Antigua Guatemala;Puerto Barrios
BLZ|Belize City;Belmopan;San Ignacio;Orange Walk;Corozal;Dangriga
VEN|Caracas;Maracaibo;Valencia;Barquisimeto;Maracay;Ciudad Guayana
GUY|Georgetown;Linden;New Amsterdam;Anna Regina;Bartica;Lethem
SUR|Paramaribo;Lelydorp;Nieuw Nickerie;Moengo;Albina;Brokopondo
FRA|Paris;Marseille;Lyon;Toulouse;Nice;Nantes
ECU|Quito;Guayaquil;Cuenca;Santo Domingo;Machala;Manta
PRI|San Juan;Bayamón;Ponce;Carolina;Caguas;Mayagüez
JAM|Kingston;Montego Bay;Spanish Town;Portmore;Mandeville;Ocho Rios
CUB|Havana;Santiago de Cuba;Camagüey;Holguín;Santa Clara;Guantánamo
ZWE|Harare;Bulawayo;Chitungwiza;Mutare;Gweru;Masvingo
BWA|Gaborone;Francistown;Maun;Molepolole;Serowe;Lobatse
NAM|Windhoek;Walvis Bay;Swakopmund;Rundu;Oshakati;Katima Mulilo
SEN|Dakar;Thiès;Saint-Louis;Kaolack;Ziguinchor;Touba
MLI|Bamako;Sikasso;Ségou;Mopti;Kayes;Timbuktu
MRT|Nouakchott;Nouadhibou;Kiffa;Kaédi;Rosso;Atar
BEN|Cotonou;Porto-Novo;Parakou;Abomey;Bohicon;Djougou
NER|Niamey;Zinder;Maradi;Agadez;Tahoua;Dosso
NGA|Lagos;Abuja;Kano;Ibadan;Port Harcourt;Benin City
CMR|Douala;Yaoundé;Garoua;Bamenda;Maroua;Bafoussam
TGO|Lomé;Sokodé;Kara;Kpalimé;Atakpamé;Dapaong
GHA|Accra;Kumasi;Tamale;Tema;Sekondi-Takoradi;Cape Coast
CIV|Abidjan;Yamoussoukro;Bouaké;Daloa;San-Pédro;Korhogo
GIN|Conakry;Kankan;Nzérékoré;Kindia;Labé;Boké
GNB|Bissau;Bafatá;Gabú;Bissorã;Bolama;Cacheu
LBR|Monrovia;Gbarnga;Buchanan;Ganta;Kakata;Harper
SLE|Freetown;Bo;Kenema;Makeni;Koidu;Port Loko
BFA|Ouagadougou;Bobo-Dioulasso;Koudougou;Ouahigouya;Banfora;Kaya
CAF|Bangui;Bimbo;Berbérati;Bambari;Bouar;Bossangoa
COG|Brazzaville;Pointe-Noire;Dolisie;Nkayi;Ouésso;Owando
GAB|Libreville;Port-Gentil;Franceville;Oyem;Moanda;Lambaréné
GNQ|Malabo;Bata;Ebebiyín;Mongomo;Luba;Evinayong
ZMB|Lusaka;Kitwe;Ndola;Kabwe;Livingstone;Chipata
MWI|Lilongwe;Blantyre;Mzuzu;Zomba;Kasungu;Mangochi
MOZ|Maputo;Matola;Beira;Nampula;Chimoio;Tete
SWZ|Mbabane;Manzini;Lobamba;Siteki;Nhlangano;Big Bend
AGO|Luanda;Huambo;Lobito;Benguela;Lubango;Malanje
BDI|Bujumbura;Gitega;Ngozi;Rumonge;Muyinga;Ruyigi
ISR|Tel Aviv;Haifa;Beersheba;Rishon LeZion;Petah Tikva;Ashdod
LBN|Beirut;Tripoli;Sidon;Tyre;Zahlé;Baalbek
MDG|Antananarivo;Toamasina;Antsirabe;Mahajanga;Fianarantsoa;Toliara
PSE|Gaza City;Ramallah;Hebron;Nablus;Bethlehem;Jenin
GMB|Banjul;Serekunda;Brikama;Bakau;Farafenni;Basse Santa Su
TUN|Tunis;Sfax;Sousse;Kairouan;Bizerte;Gabès
DZA|Algiers;Oran;Constantine;Annaba;Batna;Sétif
JOR|Amman;Zarqa;Irbid;Aqaba;Salt;Madaba
ARE|Dubai;Abu Dhabi;Sharjah;Ajman;Ras Al Khaimah;Al Ain
QAT|Doha;Al Rayyan;Al Wakrah;Al Khor;Dukhan;Mesaieed
KWT|Kuwait City;Hawalli;Salmiya;Al Ahmadi;Jahra;Farwaniya
IRQ|Baghdad;Basra;Mosul;Erbil;Najaf;Sulaymaniyah
OMN|Muscat;Salalah;Sohar;Nizwa;Sur;Ibri
VUT|Port Vila;Luganville;Isangel;Lakatoro
KHM|Phnom Penh;Siem Reap;Battambang;Sihanoukville;Kampong Cham;Kampot
THA|Bangkok;Chiang Mai;Khon Kaen;Nakhon Ratchasima;Hat Yai;Phuket
LAO|Vientiane;Luang Prabang;Savannakhet;Pakse;Thakhek;Phonsavan
MMR|Yangon;Mandalay;Naypyidaw;Mawlamyine;Bago;Pathein
VNM|Hanoi;Ho Chi Minh City;Da Nang;Haiphong;Can Tho;Hue
PRK|Pyongyang;Hamhung;Chongjin;Nampo;Wonsan;Sinuiju
KOR|Seoul;Busan;Incheon;Daegu;Daejeon;Gwangju
MNG|Ulaanbaatar;Erdenet;Darkhan;Choibalsan;Mörön;Khovd
IND|Mumbai;Delhi;Bengaluru;Chennai;Kolkata;Hyderabad
BGD|Dhaka;Chattogram;Khulna;Rajshahi;Sylhet;Barishal
BTN|Thimphu;Phuntsholing;Paro;Punakha;Wangdue Phodrang;Gelephu
NPL|Kathmandu;Pokhara;Lalitpur;Biratnagar;Birgunj;Bharatpur
PAK|Karachi;Lahore;Islamabad;Faisalabad;Rawalpindi;Peshawar
AFG|Kabul;Kandahar;Herat;Mazar-i-Sharif;Jalalabad;Kunduz
TJK|Dushanbe;Khujand;Bokhtar;Kulob;Istaravshan;Khorog
KGZ|Bishkek;Osh;Jalal-Abad;Karakol;Tokmok;Naryn
TKM|Ashgabat;Türkmenabat;Daşoguz;Mary;Balkanabat;Türkmenbaşy
IRN|Tehran;Mashhad;Isfahan;Shiraz;Tabriz;Ahvaz
SYR|Damascus;Aleppo;Homs;Hama;Latakia;Deir ez-Zor
ARM|Yerevan;Gyumri;Vanadzor;Vagharshapat;Hrazdan;Kapan
SWE|Stockholm;Gothenburg;Malmö;Uppsala;Västerås;Örebro
BLR|Minsk;Gomel;Mogilev;Vitebsk;Grodno;Brest
UKR|Kyiv;Kharkiv;Odesa;Dnipro;Lviv;Zaporizhzhia
POL|Warsaw;Kraków;Łódź;Wrocław;Poznań;Gdańsk
AUT|Vienna;Graz;Linz;Salzburg;Innsbruck;Klagenfurt
HUN|Budapest;Debrecen;Szeged;Miskolc;Pécs;Győr
MDA|Chișinău;Bălți;Tiraspol;Bender;Cahul;Ungheni
ROU|Bucharest;Cluj-Napoca;Timișoara;Iași;Constanța;Craiova
LTU|Vilnius;Kaunas;Klaipėda;Šiauliai;Panevėžys;Alytus
LVA|Riga;Daugavpils;Liepāja;Jelgava;Jūrmala;Ventspils
EST|Tallinn;Tartu;Narva;Pärnu;Kohtla-Järve;Viljandi
DEU|Berlin;Hamburg;Munich;Cologne;Frankfurt;Stuttgart
BGR|Sofia;Plovdiv;Varna;Burgas;Ruse;Stara Zagora
GRC|Athens;Thessaloniki;Patras;Heraklion;Larissa;Volos
TUR|Istanbul;Ankara;İzmir;Bursa;Antalya;Gaziantep
ALB|Tirana;Durrës;Vlorë;Shkodër;Elbasan;Korçë
HRV|Zagreb;Split;Rijeka;Osijek;Zadar;Dubrovnik
CHE|Zürich;Geneva;Basel;Lausanne;Bern;Winterthur
LUX|Luxembourg City;Esch-sur-Alzette;Differdange;Dudelange;Ettelbruck;Diekirch
BEL|Brussels;Antwerp;Ghent;Charleroi;Liège;Bruges
NLD|Amsterdam;Rotterdam;The Hague;Utrecht;Eindhoven;Groningen
PRT|Lisbon;Porto;Coimbra;Braga;Funchal;Faro
ESP|Madrid;Barcelona;Valencia;Seville;Zaragoza;Málaga
IRL|Dublin;Cork;Limerick;Galway;Waterford;Drogheda
NCL|Nouméa;Dumbéa;Mont-Dore;Païta;Koné;Bourail
SLB|Honiara;Gizo;Auki;Noro;Tulagi;Kirakira
NZL|Auckland;Wellington;Christchurch;Hamilton;Tauranga;Dunedin
AUS|Sydney;Melbourne;Brisbane;Perth;Adelaide;Canberra
LKA|Colombo;Kandy;Galle;Jaffna;Negombo;Trincomalee
CHN|Shanghai;Beijing;Shenzhen;Guangzhou;Chengdu;Wuhan
TWN|Taipei;New Taipei;Taichung;Kaohsiung;Tainan;Hsinchu
ITA|Rome;Milan;Naples;Turin;Palermo;Bologna
DNK|Copenhagen;Aarhus;Odense;Aalborg;Esbjerg;Randers
GBR|London;Birmingham;Manchester;Glasgow;Edinburgh;Cardiff
ISL|Reykjavík;Kópavogur;Hafnarfjörður;Akureyri;Reykjanesbær;Selfoss
AZE|Baku;Ganja;Sumgait;Mingachevir;Lankaran;Nakhchivan
GEO|Tbilisi;Batumi;Kutaisi;Rustavi;Gori;Poti
PHL|Manila;Quezon City;Davao City;Cebu City;Zamboanga City;Iloilo City
MYS|Kuala Lumpur;George Town;Johor Bahru;Ipoh;Kuching;Kota Kinabalu
BRN|Bandar Seri Begawan;Kuala Belait;Seria;Tutong;Bangar;Muara
SVN|Ljubljana;Maribor;Celje;Kranj;Koper;Velenje
FIN|Helsinki;Espoo;Tampere;Vantaa;Oulu;Turku
SVK|Bratislava;Košice;Prešov;Žilina;Banská Bystrica;Nitra
CZE|Prague;Brno;Ostrava;Plzeň;Liberec;Olomouc
ERI|Asmara;Keren;Massawa;Assab;Mendefera;Barentu
JPN|Tokyo;Osaka;Yokohama;Nagoya;Sapporo;Fukuoka
PRY|Asunción;Ciudad del Este;San Lorenzo;Luque;Encarnación;Pedro Juan Caballero
YEM|Sana'a;Aden;Taiz;Al Hudaydah;Ibb;Mukalla
SAU|Riyadh;Jeddah;Mecca;Medina;Dammam;Taif
CYP|Nicosia;Limassol;Larnaca;Paphos;Famagusta;Kyrenia
MAR|Casablanca;Rabat;Fez;Marrakesh;Tangier;Agadir
EGY|Cairo;Alexandria;Giza;Port Said;Suez;Luxor
LBY|Tripoli;Benghazi;Misrata;Bayda;Zawiya;Sabha
ETH|Addis Ababa;Dire Dawa;Adama;Gondar;Hawassa;Bahir Dar
DJI|Djibouti City;Ali Sabieh;Tadjoura;Obock;Dikhil;Arta
SOL|Hargeisa;Berbera;Burao;Borama;Gabiley;Erigavo
UGA|Kampala;Gulu;Mbarara;Jinja;Mbale;Entebbe
RWA|Kigali;Huye;Musanze;Rubavu;Muhanga;Rusizi
BIH|Sarajevo;Banja Luka;Tuzla;Zenica;Mostar;Bihać
MKD|Skopje;Bitola;Kumanovo;Prilep;Tetovo;Ohrid
SRB|Belgrade;Novi Sad;Niš;Kragujevac;Subotica;Novi Pazar
MNE|Podgorica;Nikšić;Pljevlja;Bijelo Polje;Bar;Cetinje
KOS|Pristina;Prizren;Peja;Gjakova;Gjilan;Ferizaj
TTO|Port of Spain;San Fernando;Chaguanas;Arima;Point Fortin;Scarborough
SSD|Juba;Wau;Malakal;Bor;Yambio;Aweil
USA|New York;Los Angeles;Chicago;Houston;Phoenix;Philadelphia
CAN|Toronto;Montréal;Vancouver;Calgary;Ottawa;Edmonton
AND|Andorra la Vella;Escaldes-Engordany;Encamp;Sant Julià de Lòria;La Massana;Ordino
ATG|St. John's;All Saints;Liberta;Codrington
BHR|Manama;Muharraq;Riffa;Hamad Town;Isa Town;Sitra
BRB|Bridgetown;Speightstown;Oistins;Holetown
CPV|Praia;Mindelo;Santa Maria;Assomada;Espargos;São Filipe
COM|Moroni;Mutsamudu;Fomboni;Domoni;Mitsamiouli;Ouani
DMA|Roseau;Portsmouth;Marigot;Mahaut
GRD|St. George's;Gouyave;Grenville;Victoria;Hillsborough;Sauteurs
KIR|Betio;Bairiki;Bikenibeu;Tabwakea;London;Bonriki
LIE|Vaduz;Schaan;Triesen;Balzers;Eschen;Mauren
MDV|Malé;Addu City;Fuvahmulah;Kulhudhuffushi;Thinadhoo;Naifaru
MHL|Delap-Uliga-Djarrit;Ebeye;Laura;Jabor;Arno;Wotje
MLT|Valletta;Birkirkara;Mosta;Sliema;St. Paul's Bay;Victoria
MUS|Port Louis;Beau Bassin-Rose Hill;Vacoas-Phoenix;Curepipe;Quatre Bornes;Mahébourg
FSM|Palikir;Weno;Kolonia;Tofol;Colonia;Lelu
MCO|Monaco-Ville;Monte-Carlo;La Condamine;Fontvieille
NRU|Yaren;Arijejen;Denigomodu;Yangor;Anabar;Menen
PLW|Koror;Ngerulmud;Melekeok;Ngetkib;Kloulklubed
KNA|Basseterre;Charlestown;Sandy Point Town;Dieppe Bay Town;Cayon
LCA|Castries;Vieux Fort;Soufrière;Gros Islet;Micoud;Dennery
VCT|Kingstown;Georgetown;Barrouallie;Chateaubelair;Port Elizabeth;Layou
WSM|Apia;Asau;Salelologa;Leulumoega;Safotu;Lufilufi
SMR|City of San Marino;Serravalle;Borgo Maggiore;Domagnano;Fiorentino;Acquaviva
STP|São Tomé;Santo António;Trindade;Neves;Santana;Guadalupe
SYC|Victoria;Anse Boileau;Beau Vallon;Anse Royale
SGP|Downtown Core;Tampines;Woodlands;Jurong East;Queenstown;Bedok
TON|Nuku'alofa;Neiafu;Haveluloto;Pangai;Ohonua;Vaini
TUV|Funafuti;Savave;Asau;Tanrake;Teava;Kulia
VAT|Vatican City
'''
extra_raw='''
AND|Andorra|1.52|42.51
ATG|Antigua and Barbuda|-61.80|17.10
BHR|Bahrain|50.56|26.07
BRB|Barbados|-59.55|13.19
CPV|Cabo Verde|-23.51|14.92
COM|Comoros|43.25|-11.65
DMA|Dominica|-61.37|15.42
GRD|Grenada|-61.68|12.12
KIR|Kiribati|173.00|1.43
LIE|Liechtenstein|9.55|47.17
MDV|Maldives|73.51|4.18
MHL|Marshall Islands|171.38|7.09
MLT|Malta|14.48|35.91
MUS|Mauritius|57.55|-20.28
FSM|Federated States of Micronesia|158.16|6.92
MCO|Monaco|7.42|43.74
NRU|Nauru|166.93|-0.52
PLW|Palau|134.56|7.50
KNA|Saint Kitts and Nevis|-62.76|17.30
LCA|Saint Lucia|-60.98|13.91
VCT|Saint Vincent and the Grenadines|-61.21|13.25
WSM|Samoa|-172.10|-13.80
SMR|San Marino|12.45|43.94
STP|São Tomé and Príncipe|6.73|0.34
SYC|Seychelles|55.45|-4.62
SGP|Singapore|103.85|1.29
TON|Tonga|-175.20|-21.14
TUV|Tuvalu|179.19|-8.52
VAT|Holy See (Vatican City)|12.45|41.90
'''
base=json.load(open('work/map-data.json'))
names={x['id']:x['name'] for x in base}|{'CAN':'Canada'}
rows={}
for line in raw.strip().splitlines():
    k,v=line.split('|'); assert k not in rows; rows[k]=v.split(';')
extras=[]
for line in extra_raw.strip().splitlines():
    k,name,lon,lat=line.split('|'); assert k not in names
    extras.append({'id':k,'name':name,'cities':rows[k],'lon':float(lon),'lat':float(lat)})
    names[k]=name
assert set(rows)==set(names),(set(rows)-set(names),set(names)-set(rows))
assert len(names)==204
catalog={k:{'name':names[k],'cities':v} for k,v in rows.items()}
for k,kind,note in [
    ('ATF','research bases','Research stations with rotating staff, not conventional cities. No permanent civilian city population is implied.'),
    ('SGP','planning areas','Singapore is a city-state. Entries are real URA planning areas within the same city.'),
    ('MCO','quarters','Monaco is a city-state. Entries are real named quarters within the same city.'),
    ('VAT','city-state','Vatican City is the sole settlement; extra cities are not fabricated.'),
    ('NRU','settlements','Includes the named Yaren district alongside real settlements. These are not all incorporated cities.'),
    ('KIR','settlements','Includes villages in South Tarawa and on Kiritimati; these are not separate large cities.'),
    ('MHL','settlements','Delap-Uliga-Djarrit is the urban settlement of Majuro; Laura is a distinct settlement on the same atoll.'),
    ('TUV','settlements','Includes island villages and Funafuti. These are not separate large cities.'),
    ('ESH','cities and settlements','Western Sahara is disputed. Place names are scenario geography and do not assert sovereignty.'),
    ('SOL','cities and settlements','Somaliland is a disputed scenario entity. Place names and the simplified scenario do not assert recognition or current control.'),
    ('KOS','cities and settlements','Kosovo is a disputed scenario entity; naming does not resolve recognition.'),
    ('CYP','cities and settlements','The island is divided in practice. The simplified country includes places across the divide and does not model current jurisdiction.'),
    ('MDA','cities and settlements','Includes Tiraspol and Bender in the disputed Transnistrian region; the simplified scenario does not model current jurisdiction.'),
]:
    catalog[k]['kind']=kind;catalog[k]['note']=note
for e in extras:
    e.update({k:catalog[e['id']][k] for k in ['kind','note'] if k in catalog[e['id']]})
for k,e in catalog.items():
    assert len(e['cities'])==len(set(e['cities'])),k
    assert len(e['cities'])>=3 or k=='VAT',k
    assert not any(x in ['Capital district','Regional center','Growth district'] for x in e['cities'])
Path('work/city-catalog-v5.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
Path('work/missing-countries-v5.json').write_text(json.dumps(extras,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'totalEntities':len(catalog),'existingCovered':len(base)+1,'extraEntities':len(extras),'citiesSettlementsDistricts':sum(len(v['cities']) for v in catalog.values()),'extras':[x['id'] for x in extras]}))
iso_pairs='''FJI:FJ TZA:TZ ESH:EH KAZ:KZ UZB:UZ PNG:PG IDN:ID ARG:AR CHL:CL COD:CD SOM:SO KEN:KE SDN:SD TCD:TD HTI:HT DOM:DO RUS:RU BHS:BS FLK:FK NOR:NO GRL:GL ATF:TF TLS:TL ZAF:ZA LSO:LS MEX:MX URY:UY BRA:BR BOL:BO PER:PE COL:CO PAN:PA CRI:CR NIC:NI HND:HN SLV:SV GTM:GT BLZ:BZ VEN:VE GUY:GY SUR:SR FRA:FR ECU:EC PRI:PR JAM:JM CUB:CU ZWE:ZW BWA:BW NAM:NA SEN:SN MLI:ML MRT:MR BEN:BJ NER:NE NGA:NG CMR:CM TGO:TG GHA:GH CIV:CI GIN:GN GNB:GW LBR:LR SLE:SL BFA:BF CAF:CF COG:CG GAB:GA GNQ:GQ ZMB:ZM MWI:MW MOZ:MZ SWZ:SZ AGO:AO BDI:BI ISR:IL LBN:LB MDG:MG PSE:PS GMB:GM TUN:TN DZA:DZ JOR:JO ARE:AE QAT:QA KWT:KW IRQ:IQ OMN:OM VUT:VU KHM:KH THA:TH LAO:LA MMR:MM VNM:VN PRK:KP KOR:KR MNG:MN IND:IN BGD:BD BTN:BT NPL:NP PAK:PK AFG:AF TJK:TJ KGZ:KG TKM:TM IRN:IR SYR:SY ARM:AM SWE:SE BLR:BY UKR:UA POL:PL AUT:AT HUN:HU MDA:MD ROU:RO LTU:LT LVA:LV EST:EE DEU:DE BGR:BG GRC:GR TUR:TR ALB:AL HRV:HR CHE:CH LUX:LU BEL:BE NLD:NL PRT:PT ESP:ES IRL:IE NCL:NC SLB:SB NZL:NZ AUS:AU LKA:LK CHN:CN TWN:TW ITA:IT DNK:DK GBR:GB ISL:IS AZE:AZ GEO:GE PHL:PH MYS:MY BRN:BN SVN:SI FIN:FI SVK:SK CZE:CZ ERI:ER JPΝ:JP PRY:PY YEM:YE SAU:SA CYP:CY MAR:MA EGY:EG LBY:LY ETH:ET DJI:DJ UGA:UG RWA:RW BIH:BA MKD:MK SRB:RS MNE:ME TTO:TT SSD:SS USA:US CAN:CA AND:AD ATG:AG BHR:BH BRB:BB CPV:CV COM:KM DMA:DM GRD:GD KIR:KI LIE:LI MDV:MV MHL:MH MLT:MT MUS:MU FSM:FM MCO:MC NRU:NR PLW:PW KNA:KN LCA:LC VCT:VC WSM:WS SMR:SM STP:ST SYC:SC SGP:SG TON:TO TUV:TV VAT:VA'''.replace('JPΝ','JPN')
iso2=dict(x.split(':') for x in iso_pairs.split())
assert set(iso2)==set(catalog)-{'SOL','KOS'},(set(catalog)-set(iso2))
for k,e in catalog.items():
    e['iso2']=iso2.get(k)
    if k in iso2: e['flag']=''.join(chr(0x1F1E6+ord(x)-ord('A')) for x in iso2[k])
    elif k=='KOS': e['flag']='🇽🇰';e['flagNote']='XK is a commonly used user-assigned code, not an officially assigned ISO 3166-1 code.'
    else:e['flag']='';e['flagNote']='Somaliland has no distinct ISO 3166-1 code or standard regional-indicator flag emoji.'
for e in extras:
    e.update({k:catalog[e['id']][k] for k in ['iso2','flag']})
Path('work/city-catalog-v5.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
Path('work/missing-countries-v5.json').write_text(json.dumps(extras,ensure_ascii=False,indent=2)+'\n')
for entry in catalog.values():
    entry.setdefault('kind','cities and settlements')
for e in extras:e['kind']=catalog[e['id']]['kind']
Path('work/city-catalog-v5.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
Path('work/missing-countries-v5.json').write_text(json.dumps(extras,ensure_ascii=False,indent=2)+'\n')
