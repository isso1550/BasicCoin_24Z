# Zadanie
Prosty łańcuch bloków (10p) (termin oddania: 19.11.2024 / 22.11.2024)
* Jeden górnik
* Ustalenie protokołu wymiany danych
* Tworzenie bloków

# Pomysł na rozwiązanie

## Górnik

Rozszerzenie węzła, które posiada dodatkowo funkcje do tworzenia i kopania bloków.

###
Ze względu na problemy ze spójnością przy obciążającej trudności, kopanie jest od teraz realizowane podprocesem - krótki scenariusz:

przygodzi transakcja - program sprawdza, czy górnik jest już zajęty kopaniem - jeśli nie, to aktywuje flage BUSY - krótkie przygotowania (może powinny też być w wątku) - start wątku kopiącego - przejście do zajmowania się endpointami i przekazywania broadcastów - wątek kopiący po wykopaniu aktualizuje blok i rozsyła.

Górnika trzeba aktywować flagą przy startowaniu aplikacji (w kodzie). W przyszlosci wyniesc do cli params i poprawic testy/skrypty

## Ustalenie protokołu wymiany danych

Wszystkie wiadomości powinny mieć łatwo dostępne pole type, które węzeł odczytuje i wykorzystując ifelse / case przekierowuje do odpowiednich funkcji np. process_transaction, process_block itp.

### Sposób przechowywania

Trzeba ustalić jak przechowywać dane w tabelach transactions, blocks itp - czy całe wiadomości, czy tylko same dane obiektu

## Tworzenie bloków

Pierwszy blok to GENESIS, który jest hard-coded w węźle jako start.
Pierwsza transakcja to coinbase tworząca nowe monety, może być przelana na adres górnika.

Górnik po otrzymaniu nowej transakcji tworzy blok jako strukturę i zaczyna kopać. Po wykopaniu pakuje blok do wiadomości i rozpoczyna broadcast.
Po wykopaniu bloku rozpoczynany jest kolejny (narazie mają być pojedyncze transakcje, chociaż podany był przykład gdzie było coinbase i 1 transakcja). Jeśli nie ma transakcji w kolejce to kopacz czeka.

# Lista ogólnych pomysłów
Tutaj dopisywać ogólne pomysły na temat lub i w przyszłość, ewentualne uwagi, generalnie to czego brakuje!

* Może wynieść funkcjonalność minera do innego pliku na zasadzie Miner extends Node
* Wynieść konfiguracje (parametry typu HASH_ALGO) do oddzielnego pliku
* Własny moduł do logowania danych (consolelog)
...
# TODO + podział pracy?
Co zrobione przekreślić, co trzeba zrobić zostawić, jeśli robimy podział pracy to oznaczyć kolorami albo po prostu wpisać imie przed zadanie

* ogólne sprzątanie kodu (wydaje mi sie bardziej chaotyczny niz mogly byc)
...






