# Uwaga 05.11 (poprawione 6.11 patrz nizej)
* aktualna implementacja nie zapewnia spojnosci 
* siec traci spojnosc kiedy wezel otrzyma rownie warty (pod katem dl. lancucha) blok podczas rozsylania wlasnego
* przechowywac blockchain w postaci list zeby mozna bylo podlaczac rozgalezienia?
* najwieksze problemy przy bardzo niskim difficulty - potrzebny jest taki sredni czas kopania zeby pozwolic wiadomosci na propagacje po sieci
* dodac forki i przestarzale bloki do atm
* w przypadku missing parent mozna podejrzewac ze wystapil hard fork - to na km4
    *   czy reagowac na to pytaniem o tego rodzica?
* dodac parametr - blok startowy przy obliczaniu kont -blokiem startowym jest koniec najdluzszego lancucha 
* w przypadku soft forka wybierac ten ktory byl pierwszy, ale nie odrzucac nowszego bo galaz wciaz walczy o zycie
* dodac wizualizacje blockchaina z galeziami przy uzyciu grafu
* moze dodac przerywanie kopania jesli otrzymamy blok, ktory wykopal kopana transakcje (krok optymalizacyjny nie wymagany)

## Poprawki 6.11
* dodanie wizualizacji pod /vis
* przy reorganizacji proces zatrzmywania przy napotkaniu sciezki w przypadku forkow:
    * jesli sciezka uznana za main zostanie napotkana wczesniej niz sciezka drugiego forka to ew. w przyszlosci kiedy aktualny main zostanie porzucony ponownie dojdzie do reorganizacji - tym razem pelniej
    * jesli sciezka uznana za main to ta dalsza to wszystko ok, co najwyzej nadmiarowe dropy
* siec przy dodawaniu blokow zapamietuje ktore sa koncowkami lancuchow
* bloki z przedawnionych koncowek (krotsze o 2 lub wiecej blokow od glownego) sa poddawane reorganizacji
* reorganizacja polega na wycofywaniu po kolei blokow ze starego lancucha i przesylaniu ich transakcji do pending. Przechodzenie przez bloki konczy sie po napotkaniu genesis lub dotarciu do bloku, ktory jest czescia glownego lancucha
* po otrzymaniu i weryfikacji bloku sprawdzane jest czy lancuch do ktorego jest dolaczany nie zawiera juz tej nowej transakcji (potrzebne przy reorganizacji)
* ewentualna spojnosc - czasem kiedy fork wystapi na samym koncu blockchainu to siec moze nie brac pod uwage ostatniej wyslanej transakcji - jesli tak sie stanie to zostanie to rozwiazane kiedy tymczasowy fork sie rozwiaze
* hard fork lub przynajmniej jakikolwiek missing parent prawdopodobnie "wywala" siec (powinna dzialac ale stracic spojnosc) - na razie ciezkie do celowego wywolania w celu testow
* w temp forkach wybierany jest ten ktory dotarl dawniej
* przy reorganizacji transakcje dodawane sa na poczatek listy pending, poniewaz prawdopodobnie sa starsze i nowsze moga od nich zalezec
* im mniejsze difficulty tym wieksza szansa na forki - przy 3 sa tylko sporadyczne, 4 nie testowane na razie
* po dotarciu nowego bloku sprawdzane jest czy aktualnie kopana jest otrzymana transakcja - jesli tak to watek jest przerywany - jesli nie to i tak kopacz zorientuje sie ze juz wie o takiej wykopanej transakcji i anuluje rozsylanie - jesli wszystko pojdzie nie tak to powstanie temp fork
* logging do poprawy, bo troche chaotyczny

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

Zaczynając od najnowszego bloku (uproszczenie, które zniknie w KM4 :) ) program wybiera z bloku prev_hash, odnajduje go w pamięci (korzysta z mapy hash -> idx czyli BlocksMap) itd. aż do dojścia do genesis. Aktualnie nie ma żadnych wyjątków, więc ew. napotkanie ścieżki, która nie kończy się genesis wyłącza node. Jeśli się uda to obraca utworzony ciąg i przechodzi przez transakcje od najstarszej do najnowszej obliczając stany kont (to już proste zadanie). 

Aby dodać obsługę forków, orphan itd. należy lepiej przeanalizować wybór bloku startowego do szukania pełnego blockchainu (przechowywac id najnowszego w najdluzszej sciezce i aktualizowac? wybrac pierwszy jesli jest kilka o tej samej dlugosci?). Co zrobić kiedy najdłuższa gałąź ma brakujące bloki? (aktualnie nie może tak sie stac, bo program nie przyjmuje blokow bez znanego poprzednika - mozna to rozwinac o mechanizm odpytywania sasiadow czy ktos ma takiego poprzednika).

Zamiast poszukiwania blockchainu można dodać strukturę, która będzie przechowywać go cały czas i w przpadku braku poprzednika odrzucać od razu po przyjęciu. 

## Konsensus

Dwóch kopaczy - jeśli nowy blok dołącza się do ścieżki, która nie jest najdłuższa to jest automatycznie odrzucany.


# Lista ogólnych pomysłów






