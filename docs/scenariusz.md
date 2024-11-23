# Scenariusz historii jednej transakcji od wysłania do akceptacji bloku
* przygotowanie transakcji
* wysłanie transakcji przez autora
* odebranie broadcastu przez inny węzeł
* process_transaction
    * odrzuc coinbase
    * sprawdz, czy hash rzeczywisty rowny temu dolaczonemu do wiadomosci
    * zapisz transakcje i przekaz dalej 
        * jeśli zlosliwy node bedacy mostem nie przekazuje dalej to nie da sie nic z tym zrobic, siec powinna byc tak utworzona troche nadmiarowo, alternatywnie wezly po pewnym czasie bez pracy moga sie przelaczac gdzie indziej
* sprobuj kopac jesli wezel kopacz
* sprawdz czy kopacz juz zajety kopaniem
* utworz blok z transakcja
    * pobierz najstarsza transakcje z zapamietanych
    * verify transaction
        * odrzuc coinbase
        * sprawdz podpis 
        * sprawdz, czy ID i klucz sa zgodne
        * oblicz stany kont
            * wez najdluzszy lancuch w blockchainie
            * przejdz przez wszystkie zapisane bloki od jego poczatku dodajac transakcje
        * sprawdz, czy wysylajacy jest znany i ma wystarczajace srodki
        * pozostale rzeczy juz sprawdzone przy zatwierdzaniu tej transakcji do pamieci przy process_transaction wiec pomin
    * po weryfikacji sprawdz, czy wciaz transakcja dostepna do kopania
    * pobierz hash ostatniego bloku najdluzszego lancucha i wstaw jako prev_hash
* wykop dla danego difficulty
* zapisz blok u siebie (wiecej info dalej)
* rozeslij dalej przez broadcast
* inny wezel odbiera blok
* process_block
    * czy hash rzeczywisty zgadza sie z otrzymanym
    * czy odpowiednia liczba zer z przodu hasha (trudnosc)
    * czy hash transakcji poprawny
    * czy istnieje rodzic
        * jesli nie to hard fork - rozpocznij synchronizacje
        * zapytaj sasiadow o lancuch, w ktorym zawarty jest szukany rodzic 
        * dodaj nowy blok do lancucha jego rodzica (na koniec)
        * sync_chain(lancuch)
            * sprawdz czy ostatni blok jest znany
            * sprawdz czy nowy lancuch jest wystarczajaco dlugi w porownaniu do znanego najdluzszego, by go przyjac
            * idac od konca nowego lancucha znajdz blok, gdzie laczy sie ze znanymi lancuchami (najgorszy przypadek genesis)
            * wybierz tylko bloki dalsze niz znaleziony punkt wspolny
            * przetworz kazdy blok tak jak przy otrzymaniu przez broadcast idac od najstarszego
            * jesli ktorys blok zostanie odrzucony przerwij proces synchronizacji
            * rozeslij nowy zaakceptowany lancuch wiadomoscia broadcast kod sync_chain (wykonuja te sama funkcje)
* verify_transaction wewnetrznej transakcji
* zapisz blok
    * sprawdz czy transakcja jest juz w tym lancuchu
    * update_block_order
        * sprawdz order (dl. lancucha) przypisana do rodzica, dodaj 1, zapisz
    * sprawdz, czy lancuch po dodaniu bloku jest wystarczajaco dlugi, by go uznac
        * jesli trwa synchronizacja to zignoruj ten blad - dlugosc byla zweryfikowana przy odebraniu lancucha od sasiada
    * usun transakcje z oczekujacych na wykopanie
    * zaktualizuj wartosci zwiazane z najdluzszym lancuchem
        * jesli nowy lancuch tak samo dlugi jak najdluzszy to ostrzezenie o temp fork
        * jesli nowy lancuch najdluzszy zaktualizuj zmienna z dl. najdluzszego
        * zaktualizuj endpoint - usun rodzica z listy endpointow i wstaw nowy blok
    * zaktualizuj mape hash_bloku -> id w wektorze danych
    * jesli nie trwa synchronizacja innego lancucha (sync_chain) to znajdz bloki orphan 
        * przejdz po wszystkich znanych endpointach
        * jesli endpoint jest zbyt krotki w porownaniu do nowego najdluzszego lancucha to dodaj go jako orphan
        * pobierz glowny lancuch z pamieci
        * dla kazdego orphan
            * dodaj jego transakcje do oczekujacych na poczatek (zeby lepiej zachowac spojnosc i zaleznosci)
            * powtorz dla rodzica rekurencyjnie jesli rodzic nie jest genesis i jesli nie jest zawarty w glownym lancuchu
            * nie usuwaj blokow orphan bo ze wzgledu na asynchronicznosc moga byc problemy
* jesli ta transakcja byla w miedzyczasie kopana to przerwij kopaczowi
* broadcast dalej
* transakcja konczy jako zaakceptowana (przynajmniej narazie 😀 )

