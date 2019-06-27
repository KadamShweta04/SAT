# Linear Layout SAT solver

On linear layouts of graphs with SAT

## Development

### Init project workspace

Install python 3.7 in the development version via `apt install python3-dev` or `env PYTHON_CONFIGURE_OPTS="--enable-shared" pyenv install 3.7`

```bash
pip3 install --upgrade pipenv                       # To install pipenv
pipenv install                                      # install new dependencies from pipfile
pipenv clean                                        # remove unused dependencies
```

### Build

```bash
pipenv run pyinstaller --clean be/run_server.spec   # builds a single executable in dist/run_server
```

### Run

#### Production

Build the project 

Copy the file `dist/run_server` to the target server.

Copy the database (`data.db`) to the current directory if wanted.

Run the executable.

#### Development

```bash
pipenv run waitress-serve --listen=*:5555 be.app:app
```

#TODO 
project struckture
pagination
technical documentation