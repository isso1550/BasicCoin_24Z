# 1 Dominacja obliczeniowa jednego węzła
* dominuje kopacz 5001
* ważne elementy oznaczone komentarzem "TEST1 Param"
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