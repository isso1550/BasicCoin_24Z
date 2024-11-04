# Zadanie 
Transakcje przekazania środków (10p) (termin oddania: 10.12.2024 / 13.12.2024)
* Tworzenie transakcji, np. w formacie json (pierwszą transakcją w liście powinna być transakcja coinbase tworząca nowe "monety")
* Osiągnięcie konsensusu (metoda proof-of-work)
* Walidacja transakcji pod kątem double-spending
* Obliczanie aktualnych sald na kontach

# Pomysł na rozwiązanie

## Tworzenie transakcji

Coinbase to pierwsza transakcja, która jest wbudowana w program i przesyła x coinów na wybrane konto. Następnie to konto służy jako pewnego rodzaju ATM poprzez rozsyłanie początkowych coinów do innych węzłów. Zaimplementowany system można zilustrować:

* Programista tworzy nowy coin i stawia serwer będący wpłatomatem
* Programista tworzy transakcje coinbase i gwarantuje, że każdy nowy węzeł ją zaakceptuje. W tej transakcji wysyła 100 coinów na konto wpłatomatu
* Nowy użytkownik chcąc zwiększyć balans konta idzie do wpłatomatu i przekazuje prawdziwą gotówkę.
* Wpłatomat potwierdza wpłatę swoim kontem i przesyła zakupione coiny na konto wpłacającego

UWAGA! Jest to proof-of-concept - mogło by dojść do sytuacji, gdy coiny by się skończyły, a podczas działania sieci nie dałoby się wysłać kolejnego coinbase lub byłoby to trudne do zabezpieczenia w aktualnym podejściu. Żeby to poprawić należałoby dodać generację małych ilości coinów dla kopaczy w ramach nagrody.


Transakcje oraz bloki są walidowane pod kątem poprawności otrzymanego hasha. Otrzymany hash jest porównywany z nowym utworzonym na podstawie dokładnych danych. Hash jest przesyłany w wiadomości dla łatwiejszej dostępności i czytelności logów.

## Proof-of-work

Kopacz musi uruchamiać kopanie w trybie wielowątkowym, żeby być w stanie dalej propagować inne wiadomości

## Walidacja double-spending

W węźle zapisywane są znaczące hashe wiadomości. W przypadku transakcji jest to hash samej transakcji, gdzie zawarty jest również timestamp. Węzeł nie przyjmuje nigdy wiadomości, którą już kiedyś otrzymał więc wklejenie tej samej transakcji dwa razy do sieci nie poskutkuje jej podwójnym zapisem (za drugim razem hash zostanie rozpoznany i odrzucony!). Jeśli ktoś faktycznie powtórzy transakcję to zmieni się timestamp i hash dzięki czemu zostanie zaakceptowany

## Obliczanie aktualnych sald na kontach



# Lista ogólnych pomysłów






