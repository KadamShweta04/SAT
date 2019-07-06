import numpy
import perfplot


def setup(n):
    return n * n



perfplot.show(
    setup=setup,  # or simply setup=numpy.random.rand
    kernels=[
        lambda a: numpy.arange(0, a),
        lambda a: numpy.array(list(range(0, a)))
    ],
    labels=["numpy.arange", "numpy.array(list(range("],
    n_range=[k for k in [2, 5, 10, 50, 100, 150, 200, 400, 600]],
    xlabel="fdsf",
    # More optional arguments with their default values:
    # title=None,
    # logx=True,
    # logy=False,
    # equality_check=numpy.allclose,  # set to None to disable "correctness" assertion
    # automatic_order=True,
    # colors=None,
    # target_time_per_measurement=1.0,
)
