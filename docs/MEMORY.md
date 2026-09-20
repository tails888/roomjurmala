# ROOM Jūrmala projekta atmiņa

Atjaunināts 2026. gada 20. septembrī. Šis fails apkopo šajā darba sesijā paveikto un pārbaudīto. Tas nav servera pašreizējā stāvokļa automātisks pārskats. Pirms turpmākām izmaiņām pārbaudi kodu un faktisko izvietojumu.

## Projekts un publicēšana

- Repozitorijs `tails888/roomjurmala`.
- Publiskā vietne https://roomjurmala.lv/ un administrācija https://roomjurmala.lv/admin/.
- Vietne atrodas esošajā Hostinger hostingā. Produkcijā darbojas PHP 8.3 un SQLite3; Node serveris vajadzīgs tikai lokālajam priekšskatījumam.
- Sākotnēji lietotājs atļāva strādāt tikai `updates` zarā, vēlāk skaidri atļāva publicēt `main`. Aktuālā autorizācija ir `main`.
- Iepriekšējos darbos push uz `main` izraisīja Hostinger izvietošanu. Push pats par sevi vēl nav pierādījums veiksmīgai izvietošanai; pēc funkcionālām izmaiņām pārbaudi dzīvo vietni.
- Pirms šī dokumenta pievienošanas lokālais HEAD un attālais `main` sakrita ar `2946f5c868b6bb94336557149278cc3fd1f585e2`. Iepriekš arī publicētais `assets/js/admin.js` tika salīdzināts ar šo versiju un sakrita.
- Šajā lokālajā checkout `git fetch origin main` atjaunina `FETCH_HEAD`; nepaļaujies uz iespējami novecojušu `origin/main`.

## Izveidotais vadības panelis

Mērķis ir vienkārša latviska forma, ko īpašniece var lietot bez tehniskām zināšanām. Dizainā ir gaišs fons, serif virsraksti un oranžas galvenās pogas.

- Vienreizēja vai katru nedēļu atkārtojama pasākuma izveide.
- Nosaukums, datums, sākuma un beigu laiks, izvēles apraksts un izvēles attēls.
- Viena datuma vai šī un visu turpmāko atkārtojumu atcelšana un atjaunošana.
- Sadaļa visu šodienas un turpmāko pasākumu atcelšanai ar atsevišķu apstiprinājumu.
- Skati “Tuvākie”, “Atceltie” un “Arhīvs”. Atcelto pasākumu var arhivēt, atgriezt no arhīva vai pēc papildu apstiprinājuma neatgriezeniski dzēst.
- Atkārtojumu atcelšana, arhivēšana un dzēšana saglabā neskarto datumu vēsturi.
- Attēla izvēlē klients pieņem JPG, PNG un WebP līdz 10 MB, pārvērš par JPEG un samazina garāko malu līdz 1600 px. Serveris pārbauda saņemtā JPEG formātu, izmēru un dimensijas.
- “Publicēt pasākumu” saglabā ierakstu datubāzē un padara to pieejamu vietnes kalendārā. Šai darbībai nav nepieciešams Git push vai jauna izvietošana.
- Publiskais kalendārs lasa `/api/events`, atjaunojas aptuveni ik pēc 15 sekundēm, kamēr lapa redzama, un pēc atgriešanās cilnē. API kļūdas gadījumā var palikt iepriekš ielādētais saraksts.
- Pasākuma publicēšana pati par sevi nesūta pasākumu e-pastā vai sociālajos tīklos.

## Lietotāja pieņemtie dizaina un integrāciju lēmumi

- Google Business Profile publicēšanas/pārejas iespēja tika izmēģināta, pēc tam pēc lietotāja skaidras norādes pilnībā izņemta no administrācijas. Neatjauno to bez jauna pieprasījuma. Publiskās vietnes Google Maps saites un atsauksmes ir atsevišķs saturs.
- No pasākuma formas izņemts “Aizpildi un publicē mājaslapā.”, lauku piezīmes “nav obligāts” un pastāvīgais attēla formātu/10 MB palīgteksts. Izvēles lauki joprojām nav obligāti, un validācijas kļūdu paziņojumi saglabāti.
- Lietotājs vēlējās paroli īsāku par 12 rakstzīmēm; pašreizējais minimums ir 8 rakstzīmes. Backend papildus ierobežo paroli līdz 72 baitiem.
- Tika apspriestas alternatīvas dizaina koncepcijas. Nav apstiprināta pilnīga paneļa pārveidošana.

## Konti un pirmā aktivizācija

- Ir divas paredzētas administratoru vietas — īpašniece un pārvaldnieks. Katram sava parole un sesija, abiem vienādas tiesības pārvaldīt kopīgo kalendāru. Nav publiskas reģistrācijas vai trešā konta.
- Pārvaldnieka piekļuve tika praktiski lietota. Īpašnieces kontu nedrīkst uzskatīt par aktivizētu tikai tāpēc, ka sagatavota vai nosūtīta saite.
- Pēdējā tiešajā pārbaudē pirms šī dokumenta īpašnieces personīgā aktivizācijas saite joprojām tika pieņemta kā neizmantota. Tas nozīmēja, ka tajā pārbaudes brīdī konts vēl nebija aktivizēts. Vēlāks pabeigtas aktivizācijas apstiprinājums nav saņemts.
- Pirmajai reizei nepieciešama pilnā personīgā saite ar `#activate=…`, nevis tikai `/admin/`. Jāizvēlas parole un jāiesniedz “Izveidot piekļuvi”.
- Pēc saites atvēršanas pārlūks apzināti izņem tokenu no adreses. Tas, ka adreses joslā paliek `/admin/`, nenozīmē kļūdu. Kopējot adresi pēc atvēršanas, aktivizācijas tokena vairs nebūs.
- Ielūgumi ir vienreizēji, pašreizējā plūsmā piesaistīti e-pastam un ģenerēti ar 48 stundu termiņu. Vecas saites nederīgums viens pats nepierāda aktivizāciju — tā var būt arī beigusies vai aizstāta.
- Personīgos kontu e-pastus, pilnās aktivizācijas saites, tokenus un paroles šajā repozitorija atmiņā neglabāt.

## Paroles atjaunošana un pārbaudīta e-pasta piegāde

Ieviests “Aizmirsi paroli?” ar e-pasta ievadi un vienreizēju saiti, kas derīga 30 minūtes. Pēc saites atvēršanas lietotājs ievada un atkārto jauno paroli, tad ielogojas no jauna.

- Endpunkti `/api/password/forgot`, `/api/password/check` un `/api/password/reset`.
- Nejauši 256 bitu tokeni; datubāzē glabājas tikai SHA-256 jaucējvērtības. Tokens URL fragmentā tiek noņemts no adreses un netiek atdots publiskās API atbildēs.
- Veiksmīga atjaunošana dzēš visas konkrētā konta atjaunošanas saites un anulē šī konta iepriekšējās sesijas. Otra administratora konts un pasākumi netiek mainīti.
- Atbildes teksts neatklāj, vai e-pasts pieder administratoram. Zemāk aprakstītais laika atšķirības risks joprojām pastāv.
- Sākotnējais PHP `mail()` atgrieza sekmīgu pieņemšanu, bet lietotājs nesaņēma vēstuli ne iesūtnē, ne mēstulēs.
- Pievienots autentificēts Hostinger SMTP caur `smtp.hostinger.com`, portu 465 un TLS, ar esošo `welcome@roomjurmala.lv` pastkasti. Izmantots fiksētas versijas PHPMailer 7.1.1; avots un licences informācija ir `server/vendor/phpmailer/`.
- Lietotājs pats Hostinger privātajā failu redaktorā saglabāja pastkastes paroli. Paroles saturs netika nolasīts vai ievietots Git.
- Pēc konfigurācijas diagnostika apstiprināja SMTP pieņemšanu bez kļūdas. Lietotājs arī skaidri apstiprināja pārbaudes vēstules saņemšanu savā Gmail iesūtnē. Tātad piegāde pārvaldniekam tika praktiski pārbaudīta; īpašnieces iesūtnes piegāde atsevišķi nav apstiprināta.
- Tukšs esošs paroles fails izraisa nosūtīšanas kļūdu. Ja fails neeksistē, pašreizējais kods joprojām izmanto iepriekšējo PHP `mail()` rezerves ceļu.
- Plašāka tehniskā informācija ir `docs/password-recovery.md`. README agrākās frāzes par neesošu e-pasta atjaunošanu ir novecojušas un vēl jāizlabo.

## Datu glabāšana

Hostinger izvieto repozitorija saturu `public_html`. Privātā `.roomjurmala-admin` mape atrodas blakus tai, ārpus publiskās saknes.

| Privātais resurss | Saturs |
| --- | --- |
| `calendar.sqlite` | Pasākumi, administratoru paroļu jaucējvērtības, kontu versijas, ielūgumu izmantošana, atjaunošanas tokenu jaucējvērtības un mēģinājumu limiti |
| `sessions/` | PHP sesijas |
| `images/` | Pasākumu attēli, ko publiski izsniedz kontrolēts API maršruts |
| `invitations.json` | Ielūgumu konfigurācija; vecākai plūsmai iespējams arī `bootstrap.json` |
| `smtp-password.txt` | SMTP pastkastes parole, pieejama tikai servera privātajā glabātuvē |
| `mail-status.json` | Pēdējās nosūtīšanas laiks, transports, pieņemšanas statuss un kļūda |

Git izvietošana šo mapi nepārraksta. `ROOM_DATA_DIR` var mainīt glabātuves vietu, bet kods noraida privātu glabātuvi mājaslapas publiskajā saknē. `ROOM_ORIGIN` nosaka atļauto origin. Parastās administratoru paroles glabājas kā jaucējvērtības; SMTP parole ir atsevišķs servera noslēpums failā.

Neiekļaut Git datubāzi, sesijas, SMTP failu, aktivizācijas materiālus vai lokālo testa pasta outbox. Produkcijas datubāzes rezerves kopiju atjaunošana nav praktiski pārbaudīta. Publiskais notikumu API pašreiz atdod arī atcelšanas/arhīva metadatus; arhīvs nav privātas informācijas glabātuve.

## Veiktās pārbaudes un atlikušais

- Pēdējā izpildē izturēti visi 32 testi, arī PHP integrācijas testi. Pārbaudītas abu testa kontu neatkarīgas sesijas, viesu piekļuves liegums, Origin/CSRF, datumu validācija, atkārtotas publicēšanas novēršana, attēli, atcelšana, arhīvs un dzēšana.
- Paroles atjaunošanai testēts 30 minūšu termiņš, vienreizēja izmantošana, nederīgs tokens, īsa parole, veco sesiju anulēšana un otra konta saglabāšana. Testos ir atsevišķa privāta datubāze un lokāla pasta uztveršana, nevis īstas vēstules.
- `npm run check` pārbaudīja deviņus publiskos maršrutus un 211 resursus.
- Publicētās ielogošanās un atjaunošanas formas atvērās bez JavaScript kļūdām. Drošības pārbaudes laikā īstās paroles vai pasākumi netika mainīti.
- Mobilais izskats apskatīts 390 px un 320 px platumā. Publicētā ielogošanās lapa un pašreizējā koda lokālais autentificētā paneļa priekšskatījums ietilpa ekrānā bez horizontālas pārplūdes. Pasākuma forma un atcelšanas dialogs bija pārskatāmi.
- Mobilajā sarakstā garus pasākumu nosaukumus saspiež atsevišķā darbību kolonna. Ieteikts “Atcelt” pārvietot zem nosaukuma arī plašākos telefona izmēros. Šis labojums nav ieviests.
- Veikts statisks drošības audits un lokāli testi. Pārbaudītajā kodā neatrada kritisku ievainojamību, taču tā nav pilnas infrastruktūras pārbaude vai garantija pret uzlaušanu.
- Divi zema riska atradumi vēl nav novērsti. Kopējais autentifikācijas mēģinājumu limits var ļaut vairākiem avotiem īslaicīgi bloķēt arī pareizu ielogošanos. Sinhrona atjaunošanas e-pasta nosūtīšana var radīt atbildes laika atšķirību starp reģistrētiem un nereģistrētiem e-pastiem. Faktiska laika atšķirība produkcijā nav mērīta.
- Panelim nav MFA. Servera atjauninājumi, ugunsmūris, DDoS aizsardzība un rezerves kopiju atjaunošana nav verificēti. Pārbaudītajā HTTPS admin atbildē bija CSP un no-referrer; HSTS galvene netika novērota.

## Turpmākā darba orientieri

Galvenie faili ir `admin/index.html`, `assets/css/admin.css`, `assets/js/admin.js`, `assets/js/admin-auth.mjs`, `assets/js/event-model.mjs`, `api/index.php`, `server/bootstrap.php` un `server/password-reset.php`.

Lokālai izstrādei izmanto `npm run dev`; tas ir bez paroles un paredzēts tikai loopback adresei. To nedrīkst pasniegt kā produkcijas autentifikācijas pierādījumu. PHP backend pārbaudēm vajadzīga PHP 8.3+ vide ar SQLite3. Lietderīgās komandas ir `npm test`, `npm run check` un pēc publiskā satura/ģeneratora izmaiņām `npm run build`.

Tuvākie neatrisinātie darbi ir īpašnieces faktiskās aktivizācijas apstiprināšana, abu drošības atradumu novēršana, mobilā saraksta darbību izkārtojuma uzlabošana un novecojušā README atjaunošana. Neuzskati tos par jau paveiktiem.
