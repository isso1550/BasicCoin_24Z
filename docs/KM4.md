# Hard fork
Przy napotkaniu hard fork (prev_hash missing) node odpytuje sąsiadów o cały łańcuch idący od wadliwego bloku do genesis. Po otrzymaniu łańcucha sprawdza czy jego długość jest wystarczająca - jeśli tak to szuka najdalszego od genesis punktu wspólnego i zaczynając od niego zaczyna po kolei przetwarzać bloki w trybie syncing, który pozwala na dołączanie starych bloków (dł. sprawdzana przy porównywaniu łańcuchów). Po zakończeniu operacji rozsyła łańcuch do sąsiadów, którzy robią to samo.

# TODO
Zaktualizować logger?