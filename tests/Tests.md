# 1 Dominacja obliczeniowa jednego węzła
* dominuje kopacz 5001
* ważne elementy oznaczone komentarzem "TEST1 Param"
* atak double spending oznaczyony jako Test1 Param Mal2
* fiftyone to skrypt realizujacy symulacje double spending (dziala tylko dla poprawnie ustawionego kodu nodetest)
* pblocks zlicza bloki, gdzie wysylajacym jest konto 305..., czyli jedno z kont 5001
# 2 Awaria węzła przegubowego
* oznaczenie "TEST2 Param"
* wezlem wylaczanym jest 5002
* run_controlled do testowania mechanizmu leave_network
* run_err symuluje awarie w zaleznosci od ustawien w kodzie (patrz. oznaczenie komentarzem)
# 3 Nieautoryzowany dostęp
* sprawdza skutki podejrzanych zapytan DELETE /neighbors
* skopiowac do jakiegokolwiek nodetest i wywolac
* nie ma nodetest w folderze zeby zmniejszyc redundancje + test bardzo prosty
# 4 Nieuczciwy węzeł - akceptacja wszystkiego
# 5 Udany atak na hash
* symulacja przez odłączenie weryfikacji
# 6 Czy baza danych na pewno przechowuje zaszyfrowany klucz?
* porównanie z zaszyfrowaną i jawną postacią klucza
# 7 Błędne żądania
* dużo testów, tabela w sprawozdaniu
# 8 Atak DOS
* run_net zatrzymuje sie przed wykonaniem reszty transakcji - wtedy wlaczyc dos (chociaz mozna tez od razu - wymaga upewnienia sie ze siec sie uruchomila)
# 9 Atak przez zmowę (Sybil)
* test_connection sprawdza, czy połączenie dodatkowe działa
* run wykonuje atak
* dodany kod oznaczony przez Test9 Param