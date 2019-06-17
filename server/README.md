# Linear Layout SAT solver

## Run

```bash                             # attach to the screen session or create a new one with screen -S sat-server
pipenv install                                      # install new dependencies from pipfile
pipenv clean                                        # remove unused dependencies
pipenv run waitress-serve --listen=*:5555 be.app:app   # start the server
```

## Deploy to test server

```bash
rsync -av * --include 'be/*.py' --include '*/'  --include 'Pipfile*' --include '*.md' --include '*.py' --include 'experiment_*'  --exclude '*' mirco@sofa.fsi.uni-tuebingen.de:/home/mirco/book-embedding/
```
