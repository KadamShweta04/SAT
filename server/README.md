# Linear Layout SAT solver

## Development

### Init project workspace

```bash
pipenv install                                      # install new dependencies from pipfile
pipenv clean                                        # remove unused dependencies
```

### Build
```bash
pipenv run pyinstaller --clean be/run_server.spec   # builds a single executable in dist/run_server
```

### Run 
Copy the file `dist/run_server` to the target server.

Copy the database (`data.db`) to the current directory if wanted.

Run the executable.