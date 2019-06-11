import waitress

if __name__ == '__main__':
    waitress.serve(app=app.app, listen="*:5555")
