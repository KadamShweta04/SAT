# Linear Layout SAT solver

On linear layouts of graphs with SAT

## Development

### Init project workspace

```bash
pip3 install --upgrade pipenv                       # To install pipenv
pipenv install                                      # install new dependencies from pipfile
pipenv clean                                        # remove unused dependencies
```

### Run

#### Production

1. Copy the relevant files to the target server. E.g.:

    ```bash
    rsync -av * --include 'be/*.py' --include '*/'  --include 'Pipfile*' --include '*.md' --include '*.py'  --exclude '*' mirco@sofa.fsi.uni-tuebingen.de:/home/mirco/book-embedding/
    ```
2. Optionally enter the screen session via   `screen -r sat-server`
3. Stop the old server process
4. Start the new server process via
    ```bash
    pipenv run waitress-serve --listen=*:5555 be.app:app
    ```
_Side note:_

regularly backup the database file `data.db`

#TODO 
technical documentation
