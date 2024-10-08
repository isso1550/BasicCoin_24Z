# Zadanie
Sieć peer-to-peer i bezpieczny portfel (10p) (termin oddania: 22.10.2024 / 25.10.2024),
 * Tworzenie tożsamości cyfrowej
 * Przechowywanie kluczy w cyfrowym portfelu
 * Uruchomienie i rejestracja węzła

# Pomysł na rozwiązanie

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

# Lista ogólnych pomysłów
Tutaj dopisywać ogólne pomysły na temat lub i w przyszłość, ewentualne uwagi, generalnie to czego brakuje!

* Dodać do serwera endpoint /control, na który można by było wysyłać wszelakie komendy, które byłyby sprawdzane switchcasem. Po prostu spełniałby funkcje zdalnej konsoli do operowania węzłem w czasie rzeczywistym. Można na przykład zrobić /control?command=disconnect i podobnie connect, aby sterować połączeniem węzłów do testowania zachowania ping-pongów i innych mechanizmów spójności sieci. Przy okazji można by było fajny panel kontrolny stworzyć jakby zostało czasu i chęci. Jeśli istnieje w Node.js możliwość sterowania programem, kiedy serwer jest aktywny to jest to zupełnie niepotrzebne, ale w Pythonie tak się zbytnio nie da i stąd taki pomysł.
* 1
...
# TODO + podział pracy?
Co zrobione przekreślić, co trzeba zrobić zostawić, jeśli robimy podział pracy to oznaczyć kolorami albo po prostu wpisać imie przed zadanie

* 1
...





