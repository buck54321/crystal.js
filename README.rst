==========
Crystal.js
==========

A WebGL 3D crystal viewer with the following features

- No server-side processing. Uses HTML 5 canvas with WebGL to leverage the user's graphics processing capabilities.
- Virtually zero lag with hundreds of atoms
- Control with the mouse, the keyboard, or a game controller.
- Immersive 3D mode compatible with any phone and headset (you'll want the game controller).
- Create surfaces in any direction
- Spherical, semi-sphere, unit cell and supercell views
- Perspective and orthographic projections
- Add vectors in any direction
- Six-dimensional position control (3 translational, 3 rotational)
- Add vectors and use them to orient the crystal


----------
How to use
----------

The viewer relies on the libraries jQuery, THREE.js, and `jquery-mousewheel <https://github.com/jquery/jquery-mousewheel>`_

You can load them all from the crystal directory, but you will load faster if you use a CDN for the first two. 

::

    <body>
    <!-- Create a div to hold the crystal. Should probably have explicit positioning set.  -->
    <div id="crystalDiv" style="position:fixed;top:0;bottom:0;left:0;right:0"></div>
    
    <!-- Load the necessary scripts. Faster to use a CDN.  -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/94/three.min.js"></script>
    <script src="/crystal/jquery.mousewheel.min.js"></script>
    <script src="/crystal/crystal.js?v=0"></script>
    
    <!-- Create a set of translation vectors and basis atoms, and initialize the crystal. -->    
    <script>
        var translations = [[1.0,0,0],[0,1.0,0],[0,0,1.0]]
        atoms = []
        atoms.push(['A', 0.0, 0.0, 0.0])
        atoms.push(['G', 0.5, 0.5, 0.0])
        atoms.push(['C', 0.0, 0.5, 0.5])
        atoms.push(['De', 0.5, 0.0, 0.5])
        atoms.push(['Xy', 0.25, 0.25, 0.25])
        atoms.push(['Z', 0.75, 0.75, 0.25])
        atoms.push(['W', 0.25, 0.75, 0.75])
        atoms.push(['H', 0.75, 0.25, 0.75])
        crystal = new Crystal(translations, atoms);
        crystal.init("crystalDiv");
    </script>
    </body>
    </html>

    