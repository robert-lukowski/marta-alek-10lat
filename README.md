# Marta & Alek — 10 lat, jedna drużyna

Autorska rocznicowa gra pixel art: JavaScript, Canvas i CSS, bez backendu, frameworków, reklam ani zewnętrznych zasobów. Działa na GitHub Pages, także w podkatalogu repozytorium.

## Rozgrywka

- **Classic:** 18 wspomnień, sześć rodzajów celów i finał. Bez losowych zmian zasad.
- **Chaos:** ta sama kampania oraz sekwencje spokoju, ostrzeżenia, pojedynczego wydarzenia i odpoczynku. Wydarzenia obejmują blackout, burzę, odwrócone sterowanie, turbo, rachunki, ducha, prezenty, magnes, zamrożenie, Love Rush, jackpot i Ostatnie Serce.
- **Party:** trzy minuty podróży przez cztery pory roku, zaplanowane niespodzianki i maksymalnie minutowy finał. Łagodniejsze zasady, osobny ranking i pokaz wszystkich zdjęć, bez zmieniania postępu kampanii.
- **Boss „Życie po ślubie”:** Domowy chaos → Rachunki i obowiązki → Miłość zwycięża wszystko. Zbieraj dobre przedmioty, aby odejmować punkty bossowi. Każdy atak ma co najmniej 1,6 s zapowiedzi i bezpieczny pas.

Sterowanie: strzałki, przyciski ekranowe lub przeciąganie po planszy. **P / spacja** zatrzymuje grę. Ustawienia pozwalają zmienić głośność, wibracje, ograniczyć animacje i włączyć pełny ekran, jeśli przeglądarka go obsługuje. Utrata widoczności karty automatycznie pauzuje grę; powrót wymaga wznowienia.

## Uruchomienie i testy

Nie trzeba instalować zależności ani budować aplikacji. Uruchom serwer HTTP w katalogu repozytorium, np. `python -m http.server 8080`, i otwórz `http://localhost:8080`. Service worker nie działa z `file://`.

Node.js 22+ służy wyłącznie do sprawdzania kodu:

```sh
npm run check
npm test
npm run test:browser
```

Test przeglądarkowy używa Chrome/Chromium i protokołu CDP bez dodatkowych bibliotek. Na Windows szuka standardowej instalacji Chrome; na Linux `/usr/bin/chromium`. Inne położenie podaj w `CHROMIUM_PATH`. Uruchamia osobny lokalny serwer pod `/marta-alek-10lat/` i tymczasowy profil przeglądarki. Zrzuty zapisuje w ignorowanym `tests/artifacts/`.

44 testy jednostkowe sprawdzają tempo i wykluczanie wydarzeń, bezpieczne ataki bossa, zapis zwycięstwa tylko raz, czyszczenie efektów, pauzę, dotyk/klawiaturę, cele, zapis Party i zgodność postępu. Deterministyczny automat sterujący wyłącznie wskaźnikiem przechodzi wszystkie 18 poziomów i bossa oraz osobno kończy Party zwycięstwem — bez wymuszania punktów, żyć ani ukończenia. Test przeglądarkowy sprawdza układy 1280×900, 390×844, 320×568 i 844×390, rzeczywiste zdarzenia dotykowe, ustawienia, wszystkie scenerie, bossa, galerię, fokus dialogów, migrację starej PWA, zasoby i uruchomienie offline.

Emulacja nie zastępuje testu na fizycznym telefonie: przed scaleniem warto sprawdzić płynność, instalację i odczuwalną siłę wibracji na docelowym Androidzie/iPhonie.

## Moduły i grafika

| Moduł | Odpowiedzialność |
| --- | --- |
| `sprites.js` | Oryginalne, ręcznie zapisane pikselowe wzory przedmiotów, animacje pary, ducha i bossa; atlas w pamięci |
| `seasons.js` | Cztery buforowane, warstwowe światy: molo, plaża, park, zimowa wioska; pogoda i paralaksa |
| `renderer.js` | Plansza 384×576, ostre skalowanie z DPR, efekty, oświetlenie, podgląd i ikony |
| `game.js` | Symulacja delta-time, kolizje niezależne od wstrząsów, kontrolery i przebieg kampanii/Party |
| `chaosDirector.js`, `boss.js` | Niezależne od DOM maszyny stanów wydarzeń i finału |
| `ui.js`, `gallery.js` | Kompaktowy HUD, menu, dialogi z obsługą fokusu, galeria i pokaz finałowy |
| `storage.js`, `config.js`, `levels.js` | Zgodne zapisy, oryginalne podpisy 18 zdjęć, cele i balans |
| `audio.js`, `haptics.js`, `effects.js` | Autorskie dźwięki Web Audio, opcjonalne wibracje, ograniczone efekty celebracji |
| `pwa.js`, `service-worker.js` | Instalacja, powiadomienie o aktualizacji i kompletny zestaw offline |

Wszystkie sprite’y i środowiska powstały w kodzie tej gry — nie korzystają z grafik innych gier, emoji ani filtrów pikselizujących. Zdjęcia i oryginalne podpisy zachowano bez zmian.

## Zapisy i PWA

Zachowane zostały klucze `marta_alek_10lat_player_progress_v1_*`, lokalny ranking, wybrany profil oraz migracja najstarszego zapisu Gościa. Party ma odrębny klucz `marta_alek_10lat_party_leaderboard_v1`. Nic nie jest wysyłane na serwer.

Po pełnym pierwszym wczytaniu online service worker zapisuje 42 zasoby, w tym wszystkie zdjęcia. Aktualizacja czeka na zamknięcie wszystkich kart gry, aby nie wymieniać silnika w trakcie rozgrywki. Przy następnym wydaniu trzeba podnieść **zarówno wersję cache w `service-worker.js`, jak i `?v=` przy CSS/JS w `index.html`**. Pierwszy remaster używa wersjonowanych URL również w celu bezpiecznego przejścia ze starego workera Chaos Edition.

Instalacja jest zależna od przeglądarki: gra udostępnia przycisk instalacji i instrukcję ręcznego dodania do ekranu głównego. Tryb standalone usuwa pasek adresu, ale nie gwarantuje ukrycia interfejsu systemowego. Wibracje są opcjonalne i niedostępne w części przeglądarek. Szczegóły: [cykl aktualizacji service workerów](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) i [obsługa wibracji](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate).

## Publikacja

Remaster jest rozwijany na `feature/pixel-art-remaster` i dostarczany przez Pull Request do `main`. Sam push tej gałęzi nie zmienia publicznej wersji GitHub Pages; publikacja następuje po scaleniu zgodnie z ustawieniami repozytorium.
