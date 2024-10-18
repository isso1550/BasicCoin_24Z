# Zadanie
Sieć peer-to-peer i bezpieczny portfel (10p) (termin oddania: 22.10.2024 / 25.10.2024),
 * Tworzenie tożsamości cyfrowej
 * Przechowywanie kluczy w cyfrowym portfelu
 * Uruchomienie i rejestracja węzła

# Pomysł na rozwiązanie
Dodano rozdziały dotyczące problemów utrzymania połączenia i spójności danych 18.10

## Cyfrowy portfel

Każdy możliwy do uruchomienia węzeł reprezentujący użytkownika powinien mieć swój podfolder w zbiorczym folderze na dane. Najlepiej, aby nazwa foldera odpowiadała portowi przypisanemu do danego użytkownika, aby struktura reprezentowała symulowane rozproszenie węzłów. W odpowiednim podfolderze użytkownik posiada małą bazę danych - proponuję `sqlite`, ewentualnie przechowywanie w pliku .csv (z tego co znalazłem sqlite jest nawet prostsze). Baza danych zawiera tabelę z kolumnami:
* hash klucza publicznego - globalny identyfikator, jest to hash tworzony z klucza publicznego (proponuje sha256)
* nazwa - dowolny ciąg znaków, ma służyć do łatwego wybierania z którego konta chce skorzystać użytkownik - lepiej jest powiedzieć "Chcę wysłać pieniądze z konta "na samochód" ", zamiast "Chcę wysłać pieniądze z konta 9xf826nslafam... ".
* klucz publiczny
* klucz prywatny - zabezpieczony klucz prywatny

**Para kluczy** powinna być generowana, kiedy użytkownik wyrazi chęć rejestracji lub założenia kolejnego rachunku (maksymalna ilość nie jest ustalona). Proponuję, aby wszystko odbyło się w funkcji register, która przygotuje parę kluczy i zapisze je w odpowiedniej postaci do odpowiedniej bazy (ważne na którym porcie operuje użytkownik!) oraz funkcję login, które wczyta odpowiednią tożsamość i rozszyfruje klucz, by był gotowy do użycia. Do wykonania zadania najlepsza wydaje się być paczka `Crypto` z algorytmem RSA lub ECC - warto podejrzeć co jest w bitcoinie i rozważyć oba, żeby móc o tym opowiedzieć na obronie.

**Szyfrowanie klucza** prywatnego powinno być zrealizowane przy użyciu szyfru symetrycznego (pewnie AES w nowej wersji) z użyciem hasła od użytkownika. Hasło jest podawane przy rejestracji i logowaniu - klasyczny przypadek. 

Czyli np:
* source
* data
    * 5000
        * wallet.db 
            * default #(pk) pk enc(sk)
    * 5001
        * wallet.db
            * carfund #(pk) pk enc(sk)
            * default #(pk) pk enc(sk)
    * 5002
        * wallet.db
            * ilovemoney #(pk) pk enc(sk)
        
, gdzie pk - public key, sk - secret key, enc() - szyfrowanie, #() - hash inaczej f.skrótu

**Pytanie na przyszłość**
Czy wartość rachunku dla konta, kiedy już będą transakcje (tak wiem, wybiegam w przyszłość ale to tylko do zastanowienia) powinna być w tej bazie? Z definicji kryptowaluty wynika, że salda są obliczane według transakcji, więc pewnie lepiej nie.

## Sieć peer - to - peer

### Podstawa działania

Pojedynczy węzeł powinien być prostym serwerem (proponuje sprawdzić node `express` lub podobne rozwiązanie, ponieważ oferuje endpointy). Serwer ten przyjmuje przy uruchomieniu parametr będący portem, na którym będzie nasłuchiwać oraz w zależności od sytuacji adres innego węzła, do którego ma się podłączyć lub informację o tym, że on będzie tym pierwszym (wazne!). Po uruchomieniu węzła numer 2+ dopisuje on podany adres do listy znanych sąsiadów i wysyła wiadomość (proponuję HTTP/POST) mówiącą, że ma chęć dołączyć do sieci. Węzeł odbiorca akceptuje wiadomość i dopisuje adres nowego węzła do swojej listy sąsiadów. 

### Sprawdzanie odpowiedzi

Ponieważ każdy węzeł musi weryfikować, czy jego sąsiedzi są aktywni (nie tylko przed wysłaniem! cały czas, by niczego nie przegapić!). Do wykonania tego proponuję mechanizm ping-pong, może być z użyciem HTTP/GET, ale lepiej poszukać czegoś sprawniejszego (może da się icmp w node.js?). Wysyłanie powinno być okresowe - tak jak setTimeout w js - nie wiem co ile, to można ustalić eksperymentalnie. Jeśli sąsiad nie odpowie to węzeł zapisuje tę informację np. poprzez przeniesienie go z listy sąsiadów do listy potencjalnie wyłączonych sąsiadów. Dzięki temu pingowanie może wciąż się odbywać w celu ponownego ustawienia połączenia. 

Jeśli węzeł nie ma już żadnych sąsiadów i nie jest początkiem sieci to wyrzuca błąd w konsoli i próbuje odnowić jakieś połączenie.

Jeśli węzeł zostanie wyłączony poprawnie, a nie w skutek nagłego wypadku to powinien przekazać swoją listę sąsiadów do innych sąsiadów, którzy dzięki aktualizacji swoich list utworzą nowe połącznia, które uratują integralność sieci (pomysł do dopracowania, bo mógłby stworzyć zbyt dużo połaczeń, a nawet sieć każdy-każdy!).


### Wiadomości węzłów - broadcast (trochę wypad w przyszłość)

Każdy węzeł powinien mieć możliwość rozpropagowania wiadomości w całej sieci. Aby to osiągnąć wysyła ją do każdego sąsiada, a ten do każdego swojego sąsiada itd... Aby uniknąć pętli proponuje razem z wiadomością przesyłać jej hash, aby węzeł po otrzymaniu mógł wstawić go do swojej listy "poprzednio otrzymanych newsów". Jeśli hash już jest w liście to węzeł ignoruje wiadomość - już ją słyszał. Hash lepiej przesyłać w żądaniu, a nie obliczać na biężąco, aby nie obciążać bardziej węzłów (chociaż może to właśnie ta bardziej ekonomiczna opcja? ale nie wydaje się - trzeba zbadać).

W wiadomościach mogłaby się przydać informacja kto ją zapoczątkował.

### Kontrolowane opuszczanie sieci - dodane 18.10
Węzeł, który chce opuścić sieć powinien przekazać informacje o swoich połączeniach w taki sposób, aby zagwarantować że nie powstanie "dziura" w sieci po jego odejściu.

Pomysł na rozwiązanie:

Węzeł zgłasza opuszczenie sieci do najstarszego sąsiada (pierwszego w liście) (najstarszy jest najbardziej zaufany, bo już od dawna się z nim komunikuje). W wiadomości przekazuje mu listę swoich sąsiadów. Węzeł odbiorca sprawdza, czy otrzymana lista zawiera nieznane mu węzły: jeśli nie to odpowiada opuszczającemu "wszystkich już znam". Wtedy węzeł opuszczający próbuje tego samego z drugim najstarszym sąsiadem itd. aż do skutku. Jeśli węzeł odbiorca nie zna niektórych z otrzymanych sąsiadów to zapamiętuje ich i zwraca wiadomość "Zapamiętałem sąsiadów". W reakcji na tę wiadomość opuszczający rozsyła do wszystkich swoich sąsiadów adres tego węzła, aby mogły ustanowić dwustronne połączenie w celu propagowania wiadomości.

Podejście nie jest optymalne i stworzy wiele nadmiarowych połączeń, ale na ten moment to jedyne co jestem w stanie wymyślić. Warto zbadać to dokładniej wykorzystując różne wykresy. Może się okazać, że jest sposób na znalezienie minimalnych połączeń do przekazania. Zwrócić uwagę na metody stosowane w teorii grafów, może wykorzystać jakoś mechanizm broadcast?


### Nagłe opuszczanie sieci - dodane 18.10
Węzeł, który w sposób nieoczekiwany opuści sieć może utworzyć "dziurę".

Pomysł na rozwiązanie:


Węzeł w reakcji na nieudane połączenie z sąsiadem przenosi jego adres z listy sąsiadów do listy "niepewnych" sąsiadów. Następnie sprawdza pare razy połączenie, sprawdza czy utracony sąsiad przypadkiem nie powrócił już po chwili. Jeśli wrócił to wysyła mu wiadomość "Witaj ponownie, możliwe że przegapiłeś jakieś wieści". Awaryjny węzeł w reakcji na tę informację odpytuje wysyłającego "W takim razie pokaż mi jakie wiadomości masz zapisane" (GET /messages). Po otrzymaniu wiadomości porównuje co go ominęło i wysyła broadcast dla nieznanych dotąd wiadomość, aby zaktualizować inne węzły w jego otoczeniu, które mogły być postronnymi ofiarami awarii. W sytuacji, gdy awaryjny węzeł był mostem między dwiema grupami węzłów to powinien otrzymać co najmniej dwie listy od obu podsieci i rozpropagować wiadomości z obu, co powinno ujednolicić stan sieci (w przypadku bloków i transakcji, gdzie kolejność i poprzednicy mają znaczenie może to być poważny problem, bo nie będzie to tak proste!!!).


Wracając na początek: jeśli węzeł nie odzyska połączenia do sąsiada to całkowicie go zapomina. Tworzy to problem opisany w kolejnym mini rozdziale.

### Zapobieganie tworzenia się podsieci - dodane 18.10
Kiedy węzeł "most" między dwiema grupami węzłów ulegnie trwałej awarii to utworzą się dwie podsieci żyjące swoim życiem.


Pomysł na rozwiązanie:


Węzeł INIT/Genesis raz na jakiś czas powinień wysłać wiadomość broadcast o treści "Cześć, potwierdzam że twoje połączenie z siecią jest poprawne". Czas, co jaki jest wysyłane takie powiadomienie powinien być stały i znany każdemu węzłowi. Dzięki temu jeśli taki czas wynosi np. 1 minuta to każdy węzeł po np. 2 minutach (ważne, żeby ustalić po jakim czasie podejmowane są działania, w gre wchodzą opóźnienia w przesyłaniu!) zorientuje się "Od dawna nie dostałem potwierdzenia, czy ja jestem w sieci?". W reakcji na takie spostrzeżenie wyświetli komunikat proszący użytkownika o restart węzła, czyli podłączenie do sieci od nowa. Ponieważ wszystkie odcięte węzły zareagują w podobnym momencie to nie powinno być sytuacji, że podłączamy się do martwej podsieci. Automatyzacja "reconnecta" to już rzecz drugorzędna - ważne, żeby zdać sobie sprawę z utworzenia podsieci jak najszybciej, aby uniknąć kopania niepotrzebnych bloków! Pomysł jest autorski, a wszystkie kryptowaluty już pewnie mają swoje sprawdzone metody, więc warto też poszukać jak one rozwiązują tę sytuację.

Spójność nie powinna być problemem, ponieważ martwa podsieć po prostu zapomni co wypracowała i przyjmie stan głównej gałęzi. Jeśli reakcja będzie wystarczająco szybka to nie będzie to problem bo zmarnowana praca nie osiągnie dużych rozmiarów.

Uwaga! Zastanowić się, czy wiadomość o poprawnym połączeniu do sieci powinna być sprawdzana na podstawie jakiegoś pola zawartego wewnątrz niej, a nie czasu otrzymania. Co w przypadku, gdy wiadomość rozsyłana jest z opóźnieniem spowodowanym tymczasową awarią mostu? Czy takie rozsyłanie oznacza, że podsieć znowu dołączyła do sieci głównej? Czy może opóźni to tylko czas reakcji na utworzenie martwego odłamu? (Osobiście uważam, że chyba to pierwsze - optymistyczny scenariusz)

# Lista ogólnych pomysłów
Tutaj dopisywać ogólne pomysły na temat lub i w przyszłość, ewentualne uwagi, generalnie to czego brakuje!

* Dodać do serwera endpoint /control, na który można by było wysyłać wszelakie komendy, które byłyby sprawdzane switchcasem. Po prostu spełniałby funkcje zdalnej konsoli do operowania węzłem w czasie rzeczywistym. Można na przykład zrobić /control?command=disconnect i podobnie connect, aby sterować połączeniem węzłów do testowania zachowania ping-pongów i innych mechanizmów spójności sieci. Przy okazji można by było fajny panel kontrolny stworzyć jakby zostało czasu i chęci. Jeśli istnieje w Node.js możliwość sterowania programem, kiedy serwer jest aktywny to jest to zupełnie niepotrzebne, ale w Pythonie tak się zbytnio nie da i stąd taki pomysł.
* 1
...
# TODO + podział pracy?
Co zrobione przekreślić, co trzeba zrobić zostawić, jeśli robimy podział pracy to oznaczyć kolorami albo po prostu wpisać imie przed zadanie

* 1
...






