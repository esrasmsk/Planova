# planova

Spiralli ajanda görünümlü masaüstü planner. Electron + React + TypeScript, veriler Firebird'de.

## Kurulum

```bash
cd eplanova
npm install
npm run dev
```

Kurulum paketi (Windows):

```bash
npm run dist
```

`release/planova-Setup-1.0.0.exe` üretilir.

## Veritabanı

İlk açılışta veritabanı **yoksa kendisi oluşturur** ve tabloları kurar. Varsayılan yol
`C:\planova\PLANNER.FDB`, karakter seti UTF8. Farklı bir yol ya da sunucu için
Ayarlar sekmesini kullanın; ayarlar `%APPDATA%\planova\planner-config.json` dosyasında tutulur.

Sürücü `node-firebird` — saf JavaScript, `fbclient.dll` gerekmez. Firebird 2.5, 3.x, 4.x ve 5.x ile çalışır.

Tablolar: `PL_GOREV`, `PL_UYARI`, `PL_ETIKET`, `PL_GOREV_ETIKET`, `PL_NOT`, `PL_STICKY`, `PL_SAYFA`.
Metin alanları VARCHAR (sayfa başına 8000 karakter); BLOB kullanılmadı.

## Neler var

**Bugün** — gecikmiş işler, bugünün listesi, önümüzdeki yedi gün. Etiketle süzme.

**Takvim** — aylık ızgara. Hücreye çift tıklayınca o güne görev açılır; günlük yazılmış günler işaretli.

**Günlük** — güne bir sayfa, el yazısı görünümlü. Yazdıkça kaydeder, gün için ruh hali seçilebilir.

**Pano** — mantar pano üzerinde sürüklenebilir yapışkan notlar, altı renk.

**Notlar** — kişisel sayfalar. "Kişisel" işaretlenen sayfalar PIN girilmeden açılmaz
(Ayarlar'dan PIN tanımlanır; bu şifreleme değil, görünürlük engelidir).

**Ara** — görev, günlük, sayfa ve yapışkan notlarda tek kutudan arama.

## Hatırlatmalar

Her görev için birden fazla uyarı seçilebilir: tam zamanında, 15 dk, 1 saat, 3 saat, 1 gün,
2 gün, 1 hafta önce. Ana süreç varsayılan olarak 30 saniyede bir kontrol eder ve Windows
bildirimi gönderir; uygulama açıksa ayrıca sağ altta yapışkan not biçiminde bir kart çıkar.

Pencere kapatıldığında uygulama saat yanındaki tepside çalışmaya devam eder. Tepsi menüsünden
"Windows ile başlat" açılabilir, çıkış da oradan yapılır.

## Tekrarlanan görevler

Günlük / haftalık / aylık / yıllık, istenen aralıkla ("3 haftada bir" gibi) ve isteğe bağlı bitiş
tarihiyle. Bir tekrarlı görev tamamlandığında sıradaki nüsha etiketleri ve uyarılarıyla birlikte
otomatik oluşur.

## Kısayollar

`Ctrl+N` yeni görev · `Ctrl+F` arama
