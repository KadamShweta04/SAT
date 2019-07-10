# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# http://www.sphinx-doc.org/en/master/config

# -- Path setup --------------------------------------------------------------

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.
#
import os
import sys

sys.path.insert(0, os.path.abspath('.'))

# -- Project information -----------------------------------------------------

project = 'On linear layouts of graphs with SAT'
copyright = '2019, Mirco Haug'
author = 'Mirco Haug'

# The full version, including alpha/beta/rc tags
release = '1.0.0'

# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    'sphinx.ext.autodoc',
    'sphinxcontrib.plantuml',
]

# Add any paths that contain templates here, relative to this directory.
templates_path = ['sphinx-doc/_templates']

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = []

# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
html_theme = 'alabaster'

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ['sphinx-doc/_static']

numfig = True

# -- Extension configuration -------------------------------------------------


latex_elements = {
    'preamble': """
\\textwidth 14cm
\\textheight 22cm
\\topmargin 0.0cm
\\evensidemargin 1cm
\\oddsidemargin 1cm
\\setlength\parindent{20pt}
    """,
    'maketitle': """
\\begin{titlepage}
	\makeatletter
	\\begin{center}
		{\LARGE Eberhard Karls Universität Tübingen}\\\\
{\large Mathematisch-Naturwissenschaftliche Fakultät \\\\
Wilhelm-Schickard-Institut für Informatik\\\\[4cm]}
		{\huge Forschungsarbeit Informatik MSc.\\\\[2cm]}
		{\Large\\bf  \@title \\\\[1.5cm]}
		{\large \@author }\\\\[0.5cm]
		\@date\\\\[4cm]
		{\small\\bf Reviewers}\\\\[0.5cm]
		\parbox{7cm}
		{\\begin{center}{\large 	Michael A. Bekos}\\\\
(Informatik)\\\\
{\\footnotesize 
					Wilhelm-Schickard-Institut für Informatik\\\\
Universität Tübingen
				}\end{center}}\hfill\parbox{7cm}
			{\\begin{center}
				{\large Michael Kaufmann}\\\\
(Informatik)\\\\
{\\footnotesize 
					Wilhelm-Schickard-Institut für Informatik\\\\
Universität Tübingen
			}\end{center}
		}
	\end{center}
\makeatother
\end{titlepage}
    """,
    'fncychap': '',
    'tableofcontents': """
    
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
  
\\pagenumbering{roman}
\\setcounter{page}{1}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% Seite I: Zusammenfassug, Danksagung
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


\\section*{Abstract}

During the course of this research project an application to compute linear layouts of graphs was created. This application provides a wide variety of options and constraints to force the resulting layout in the desired shape. The application in based on python and flask. The actual computing is done by creating SAT instances from the given problem and pass those instances to the lingeling SAT solver. The application provides a extensivly documented REST API to accept problem instances. This API is currently only used by the frontend located at. 

\\section*{Zusammenfassung}

Bei einer englischen Masterarbeit muss zus\\"atzlich eine deutsche Zusammenfassung verfasst werden.

\\cleardoublepage

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% Table of Contents
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\\renewcommand{\\baselinestretch}{1.3}
\\small\\normalsize

\\tableofcontents

\\renewcommand{\\baselinestretch}{1}
\\small\\normalsize

\\cleardoublepage

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% List of Figures
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\\renewcommand{\\baselinestretch}{1.3}
\\small\\normalsize

\\addcontentsline{toc}{chapter}{List of Figures}
\\listoffigures

\\renewcommand{\\baselinestretch}{1}
\\small\\normalsize

\\cleardoublepage

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% Der Haupttext, ab hier mit arabischer Numerierung
%%% Mit \\input{dateiname} werden die Datei `dateiname' eingebunden
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\\pagenumbering{arabic}
\\setcounter{page}{1}
""",
    'pointsize': '14pt',
    'papersize': 'a4paper',
    'sphinxsetup': 'TitleColor={rgb}{0.,0.,0.}',

}

master_doc = 'index'
latex_documents = [(master_doc, 'main.tex', project, author, 'report')]
