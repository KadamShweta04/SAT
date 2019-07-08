import numpy
import perfplot


def setup(n):
    a = numpy.random.random_integers(0, 500, (n, 5)).tolist()
    return a


def str_translate_replace(a):
    s = str(a)[2:-2].translate(
        str.maketrans({'\n': None, ' ': None, ',': " "})
    ).replace(
        "] [", " 0\n"
    ) + " 0"
    return s


def join(a):
    lines = [' '.join(map(str, c)) + " 0" for c in a]
    s = "\n".join(lines)
    return s


def str_replace_only(a):
    s = str(a).replace(
        "\n", "").replace(
        " ", "").replace(
        "[[", "").replace(
        "]]", " 0").replace(
        "],[", " 0\n").replace(
        ",", " ")
    return s


def comp(a, b):
    return a == b


out = perfplot.bench(
    setup=setup,  # or simply setup=numpy.random.rand
    kernels=[
        join,
        str_replace_only,
        str_translate_replace
    ],
    labels=["join", "to_str_replace", "to_str_translate_replace"],
    n_range=[k for k in reversed([2, 5, 10, 50, 100, 150, 200, 400, 600, 1000, 5000, 10000, 100000, 1000000])],
    xlabel="Number of clauses",
    # More optional arguments with their default values:
    title="Comparison DIMACS file creation",
    # logx=True,
    # logy=False,
    equality_check=comp,  # set to None to disable "correctness" assertion
    # equality_check=numpy.allclose,  # set to None to disable "correctness" assertion
    # automatic_order=True,
    # colors=None,
    # target_time_per_measurement=1.0,
)
out.save('toDimacs.png')
out.show()
