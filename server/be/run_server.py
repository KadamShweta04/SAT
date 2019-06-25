import waitress

from be.app import app

if __name__ == '__main__':
    waitress.serve(app=app, listen="*:5555")
