# Linear Layout SAT solver

On linear layouts of graphs with SAT

## Development

Sadly there is no 

### Init project workspace

First install python, pip, pipenv

```bash
sudo apt update
sudo apt install -y python3 python3-pip                 # installs the tools to run the application 
echo "export PATH=\"~/.local/bin:\$PATH\"" >> ~/.bashrc # add pip installed binaries to path
pip3 install pipenv                                     # installs pipenv
exec bash                                               # load the new PATH variable
python3 --version                                       # should show at least python 3.6 or higher
pipenv --version                                        # should show something like pipenv, version 2018.11.26

```

Second build lingeling. You can skip this if you have lingeling already in your path.
```bash
sudo apt install -y gcc make                            # install the tools to build lingeling
git clone https://github.com/arminbiere/lingeling.git   # checkout the lingeling repo
cd lingeling                                            # change to the checked out repository
./configure.sh && make                                  # con figure and build lingeling
echo "export PATH=\"$(pwd):\$PATH\"" >> ~/.bashrc       # add the current folder to the PATH
exec bash                                               # load the new PATH variable
lingeling --version                                     # should show something like bcj 78ebb8672540bde0a335aea946bbf32515157d5a
```

To install the necessary packages to run this application run the following commands in the same directory as this file.

```bash
pipenv install          # install new dependencies from pipfile
pipenv clean            # remove unused dependencies
```

### Run

#### Production

1. Get the sources to the target server
    1. Either by checking out this repository on the target server via `git clone https://github.com/linear-layouts/SAT.git && cd SAT/server`
    1. Or by copying the relevant files directly to the target server. e.g via:
    
         ```bash
        rsync -av * --include 'be/*.py' --include '*/'  --include 'Pipfile*' --include '*.md' --include '*.py'  --exclude '*' mirco@sofa.fsi.uni-tuebingen.de:/home/mirco/book-embedding/
        ```
1. Optionally enter the screen session via   `screen -r sat-server`
1. Stop the old server process
1. Start the new server process via
    ```bash
    pipenv run waitress-serve --listen=*:5555 be.app:app
    ```
1. optionally exit the screen session via `CTRL + a` `CTRL + d`
_Side note:_

regularly backup the database file `data.db`

#TODO 
technical documentation
