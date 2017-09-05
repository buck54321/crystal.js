function __Crystal(){
    var self = this;
    var crystal = this;
    this.rootDirectory = false // Path to crystal.js directory. Needs to be set before calling init()
    this.cntrl = {}
    this.ui = {}
    this.ui.loaded = false
    var Element = function(symbol, hue, radius, sections){
        this.symbol = symbol
        this.hue = hue
        this.hexColor = new THREE.Color('hsl('+this.hue+', 100%, 50%)')
        this.atoms = []
        this.textNode = false
        this.radius = radius || 0.05
        this.sections = sections || 16
        this.geometry = new THREE.SphereGeometry( this.radius, this.sections, this.sections )
        this.meshParams = {}
        this.meshParams.color = this.hexColor
        this.meshParams.specular = 0x555555
        this.material = new THREE.MeshPhongMaterial(this.meshParams)
    }
    var Atom = function(symbol,v,element){
        // Defines an atom. Self contained. In crystal only to keep namespaces clean. 
        var self = this;
        this.element = element
        this.symbol = this.element.symbol
        this.radius = this.element.radius
        this.color = this.element.hexColor
        //var geometry = this.element.geometry //new THREE.SphereGeometry( this.radius, sections, sections );
        //var meshParams = {}
        //meshParams.color = this.color
        //meshParams.specular = 0x555555
        //this.meshParams.skinning = true
        //meshParams.emissive = 0x0000aa
        //var material = new THREE.MeshPhongMaterial( meshParams );
        THREE.Mesh.call(this, this.element.geometry, this.element.material);
        //this.sphere = new THREE.Mesh( geometry, material );
        this.position.copy(v)
        //this.position = this.sphere.position
        this.layers.enable(1)
        this.layers.enable(2)
        this.bonds = []
        this.textNode = null
        this.isRepeat = false
        this.translate = function(translation){
            // Add translation to this atoms vector and return its new position vector
            // translation : type THREE.Vector3. 
            self.position.add(translation)
            return self
        }
        this.clone = function(){
            return new Atom(self.symbol, self.position, self.element)
        }
        this.deepClone = function(){
            var atom = self.clone()
            atom.bonds = self.bonds.slice()
            return atom
        }
        this.distanceTo = function(v){
            return self.position.clone().add(v.negate()).length()
        }
    }
    Atom.prototype = Object.create(THREE.Mesh.prototype);
    Atom.prototype.constructor = Atom; 
    var Rod = function(len, radius, geometry, sphereGeometry, material){
        // Defines an atom. Self contained. Defined in crystal only to keep namespaces clean. Using len for length because a lot of THREE objects have length methods
        var self = this;
        this.radius = radius
        this.color = material.color
        this.len = len
        //console.log(geometry)
        //var geometry = new THREE.CylinderGeometry(this.radius, this.radius, this.len, 12)
        //var meshParams = {}
        //meshParams.color = this.color
        //meshParams.specular = 0xbbbbff
        //var material = new THREE.MeshPhongMaterial( meshParams );
        THREE.Mesh.call(this, geometry, material);
        this.layers.enable(1)
        this.layers.enable(2)
        this.rotateX(Math.PI/2)
        this.axis = this.getWorldDirection()
        //var geometry = new THREE.SphereGeometry( this.radius, 32, 32 );
        cap1 = new THREE.Mesh(sphereGeometry, material)
        cap2 = new THREE.Mesh(sphereGeometry, material)
        halfLength = this.axis.clone().multiplyScalar(this.len/2)
        cap1.position.add(halfLength)
        cap2.position.add(halfLength.negate())
        this.add(cap1)
        this.add(cap2)
        this.clone = function(){
            var rod = new Rod(self.len, self.radius, self.geometry, self.material)
            rod.matrix.copy(this.matrix)
            return rod
        }
    }
    Rod.prototype = Object.create(THREE.Mesh.prototype);
    Rod.prototype.constructor = Rod;
    var Arrow = function(color, length){
        var self = this;
        THREE.Group.call(this);
        this.radius = 0.01
        this.pointerLen = 0.1
        this.color = color
        this.len = length || 1.5
        var cylinderGeometry = new THREE.CylinderGeometry(this.radius, this.radius, this.len, 12)
        var meshParams = {}
        meshParams.color = this.color
        meshParams.specular = 0x8888aa
        var material = new THREE.MeshPhongMaterial( meshParams );
        this.cylinder = new THREE.Mesh(cylinderGeometry, material);
        this.add(this.cylinder)
        this.layers.enable(1)
        this.layers.enable(2)
        this.ogAxis = this.cylinder.getWorldDirection()
        this.cylinder.rotateX(Math.PI/2)
        var buttGeometry = new THREE.SphereGeometry( this.radius, 32, 32 );
        var butt = new THREE.Mesh(buttGeometry, material)
        var pointerGeometry = new THREE.CylinderGeometry(0, this.radius*3, this.pointerLen, 12)
        var pointer = new THREE.Mesh(pointerGeometry, material)
        pointer.rotateX(Math.PI/2)
        halfLength = this.ogAxis.clone().negate().multiplyScalar(this.len/2)
        butt.position.add(halfLength)
        var halfplus = this.ogAxis.clone().setLength((this.len+this.pointerLen)/2)
        pointer.position.add(halfplus)
        this.add(butt)
        this.add(pointer)
        this.tipNode = null
        this.children.forEach(function(child){
            child.position.add(self.ogAxis.clone().setLength(self.len/2))
        })
        this.clone = function(){
            var arrow = new Arrow(self.color)
            arrow.matrix.copy(this.matrix)
            return arrow
        }
        this.axis = function(){
            return self.ogAxis.clone().applyQuaternion(self.quaternion)
        }
        this.tip = function(){
            //console.log(self.axis().multiplyScalar(self.len+this.pointerLen))
            return self.getWorldPosition().add(self.axis()).multiplyScalar(self.len+this.pointerLen)
        }
    }
    Arrow.prototype = Object.create(THREE.Group.prototype);
    Arrow.prototype.constructor = Arrow;
    this.init = function(frameId){
        self.jqWindow = $(window);
        self.jqDoc = $(document)
        self.lockOrientation = screen.lockOrientation || screen.mozLockOrientation || screen.msLockOrientation;
        self.unlockOrientation = screen.unlockOrientation || screen.mozUnlockOrientation || screen.msUnlockOrientation || (screen.orientation && screen.orientation.unlock);
        self.lastFrameTime = 0
        self.currentView = 'unit cell'
        self.superCenter = new THREE.Vector3()
        var lic = new THREE.Matrix4()
        self.lastIntersectionCheck = lic.toArray()
        self.sphereRadius = 2.51
        self.sphereRepetitions = [4,4,4]
        self.ucRepetitions = [0,0,0]
        self.functionalRepetitions = self.ucRepetitions
        self.semisphereMillers = new THREE.Vector3(1,1,1)
        self.semisphereMillers.normalize()
        self.rayCaster = new THREE.Raycaster()
        self.screenCenter = new THREE.Vector2()
        self.activeAtom = false
        self.globalShift = 0
        self.controllers = {}
        self.alphaMax = 0.01
        self.rollAlphaMax = 0.005
        self.accMax = 0.02
        self.muddiness = 0.2
        self.keys = {}
        self.bttns = {}
        self.axes = {}
        self.elements = {}
        self.lastMoveTime = 0
        self.center = new THREE.Vector3()
        self.shift = new THREE.Vector3()
        self.edges = []
        for(i=0;i<5;i++){
            self.axes[i] = 0
        }
        for(i=0;i<50;i++){
            self.bttns[i] = 0
        }
        for(i=0;i<300;i++){
            self.keys[i] = 0
        }
        self.xhat = new THREE.Vector3(1,0,0)
        self.yhat = new THREE.Vector3(0,1,0)
        self.zhat = new THREE.Vector3(0,0,1)
        self.zeroVector = new THREE.Vector3()
        self.colorNumerator = 0
        self.colorDenominator = 2
        self.shiftPressed = false
        self.smartGamepad = 'ongamepadconnected' in window;
        self.getGamepads()
        self.animationFrameId = null
        self.speed = 0.1;
        self.orbitSpeed = 0.1;
        self.frame = $("#"+frameId);
        self.jsFrame = document.getElementById(frameId)
        self.jsFrame.requestFullscreen = self.jsFrame.webkitRequestFullscreen || self.jsFrame.mozRequestFullScreen || self.jsFrame.msRequestFullscreen || self.jsFrame.webkitRequestFullscreen || self.jsFrame.webkitRequestFullscreen
        self.bondGeometries = {}
        self.bondSphereGeometries = {}
        self.bondMaterial = new THREE.MeshPhongMaterial({'color':0xffffff, 'specular':0xbbbbff});
        self.bondRadius = 0.01
        self.bondSegments = 12
        self.cellFrameGeometries = {}
        self.cellFrameSphereGeometries = {}
        self.cellFrameMaterial = new THREE.MeshPhongMaterial({'color':0xaaaaaa, 'specular':0xbbbbff});
        self.cellFrameRadius = 0.02
        self.cellFrameSegments = 12
        self.makeScene();
        self.bindUi()
    }
    this.finishInit = function(){
        self.buildCrystal();
        self.animate2d();
        self.bindControls();
        self.font = null
        self.textSize = 0.075
        self.fontMaterial = new THREE.MeshPhongMaterial({color:0xf3f3f3})
        self.fontLoader = new THREE.FontLoader()
        self.fontLoader.load(self.localFilepath('optimer_regular.typeface.json'), function(font){
            self.font = font
            self.makeTextNodes()
        })
        self.ui.notWaiting(self.frame)
        //self.go3d()
    }
    this.resetCrystal = function(){
        //self.clearGroup(self.unitCell)
        self.colorNumerator = 0
        self.colorDenominator = 2
        self.clearGroup(self.atoms)
        self.elements = {}
        self.clearGroup(self.hiddenAtoms)
        self.clearGroup(self.edgeAtoms)
        self.clearGroup(self.bonds)
        self.clearGroup(self.edgeBonds)
        self.clearGroup(self.edgeBonds)
        self.clearGroup(self.edges)
        self.clearGroup(self.textNodes)
        self.clearGroup(self.unitCell)
        self.crystalGroup.position.copy(new THREE.Vector3())
        //console.log('rc 11')
        self.buildCrystal()
        if(self.font){
            //console.log('rc 14')
            self.makeTextNodes()
            //console.log('rc 15')
            self.checkIntersection()
            //console.log('rc 16')
        }
    }
    this.clearGroup = function(group){
        for (i = group.children.length - 1; i >= 0; i--){
            if(group.children[i].type === "Mesh"){
                group.remove(group.children[i]);
            }
        }    
    }
    this.makeScene = function(){
        // Add a lot of the three.js elements
        self.unitCell = new THREE.Group()
        self.scene = new THREE.Scene();
        self.crystalGroup = new THREE.Group()
        self.scene.add(self.crystalGroup)
        self.atoms = new THREE.Group()
        self.crystalGroup.add(self.atoms)
        self.hiddenAtoms = new THREE.Group()
        self.edgeAtoms = new THREE.Group()
        self.crystalGroup.add(self.edgeAtoms)
        self.edgeBonds = new THREE.Group()
        self.crystalGroup.add(self.edgeBonds)
        self.bonds = new THREE.Group()
        self.crystalGroup.add(self.bonds)
        self.edges = new THREE.Group()
        self.crystalGroup.add(self.edges)
        self.textNodes = new THREE.Group()
        self.vectorTextNodes = new THREE.Group()
        self.scene.add(self.vectorTextNodes)
        self.arrows = new THREE.Group()
        self.crystalGroup.add(self.arrows)
        self.scene.add(self.textNodes)
        self.leftFrame = null
        self.rightFrame = null
        self.frameWidth = self.frame.width()
        self.frameHeight = self.frame.height()
        self.lights = []
        self.currentCameraType = 'perspective'
        self.camera = new THREE.Group()
        self.cameraCart = new THREE.Group()
        self.camera.add(self.cameraCart)
        self.cameraCart.rotateY(Math.PI)
        self.scene.add(self.camera)
        self.camera.aspectRatio = self.frameWidth/self.frameHeight
        self.camera.orthoSize = 1
        self.perspectiveCamera = new THREE.PerspectiveCamera( 75, self.camera.aspectRatio, 0.1, 1000 );
        self.cameraCart.add(self.perspectiveCamera)
        var w = (self.camera.aspectRatio > 0 ? self.camera.orthoSize*self.camera.aspectRatio : self.camera.orthoSize)
        var h = (self.camera.aspectRatio > 0 ? self.camera.orthoSize : self.camera.orthoSize/self.camera.aspectRatio)
        self.orthoCamera = new THREE.OrthographicCamera(-w, w, h, -h, -1000, 1000)
        //self.orthoCamera.rotateZ(Math.PI)
        self.cameraCart.add(self.orthoCamera)
        self.currentCamera = self.perspectiveCamera
        self.headlight = new THREE.SpotLight( 0x8888bb );
        self.cameraCart.add(self.headlight)
        self.stereoCamera = new THREE.StereoCamera()
        self.stereoCamera.eyeSep = 0.4
        self.leftCamera = self.stereoCamera.cameraL
        self.rightCamera = self.stereoCamera.cameraR
        self.cameraCart.add(self.leftCamera)
        self.cameraCart.add(self.rightCamera)
        self.renderer = new THREE.WebGLRenderer({antialias:true});
        self.rightRenderer = null
        self.renderer.setSize(self.frameWidth, self.frameHeight);
        self.frame.append(self.renderer.domElement);
        self.ambLight = new THREE.AmbientLight(0xffffff, 0.4);
        self.scene.add(self.ambLight);
        self.lights.push(self.ambLight)
        colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff0000, 0x00ff00, 0x0000ff, 0xff0000, 0x00ff00]
        j = 0
        for(ix=-1; ix<=1; ix+=2){
            for(iy=-1; iy<=1; iy+=2){
                for(iz=-1; iz<=1; iz+=2){
                    var dirLight = new THREE.PointLight(colors[j], 0.25);
                    dirLight.position.set(100*ix, 100*iy, 100*iz);
                    self.scene.add(dirLight);
                    self.lights.push(dirLight)
                    j++
                }
            }
        }
    }
    this.makeText = function(text, position){
        geometry = new THREE.TextGeometry(text, {
            font: self.font,
            size: self.textSize,
            height: 0.01,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.005,
            bevelSize: 0.005,
            bevelSegments: 4
        });
        node = new THREE.Group() // By adding to a group and translating, the text will pivot around its center.
        textBlock = new THREE.Mesh(geometry, self.fontMaterial)
        textBlock.rotateY(Math.PI)
        node.add(textBlock)
        //textBlock.castShadow = true
        textBlock.geometry.computeBoundingBox()
        node.boxWidth = textBlock.geometry.boundingBox.max.x - textBlock.geometry.boundingBox.min.x
        node.boxHeight = textBlock.geometry.boundingBox.max.y - textBlock.geometry.boundingBox.min.y
        node.boxDepth = textBlock.geometry.boundingBox.max.z - textBlock.geometry.boundingBox.min.z
        node.centerShifter = new THREE.Vector3(-node.boxWidth/2, node.boxHeight/2, -node.boxDepth/2)
        node.centerShifter.negate()
        node.isActive = false
        node.position.copy(position)
        node.text = text
        textBlock.position.add(node.centerShifter)
        return node
    }
    this.makeArrow = function(o,v,color){
        v.normalize()
        color = color || 0x555555
        var arrow = new Arrow(color)
        arrow.position.copy(o)
        arrow.quaternion.setFromUnitVectors(arrow.ogAxis, v)
        return arrow
    }
    this.cameraUp = function(){
        return self.camera.up.clone().applyQuaternion( self.camera.quaternion );
    }
    this.cameraRight = function(){
        return self.camera.getWorldDirection().cross(self.cameraUp())
    }
    this.generateHue = function(){
        // Generates colors on the sequence 0, 1/2, 1/4, 3/4, 1/8, 3/8, 5/8, 7/8, 1/16, ...
        while(self.colorDenominator < 512){ //Should generate a little more than 100 unique values
            if(self.colorNumerator == 0){
                self.colorNumerator += 1
                return 0;
            }
            if(self.colorNumerator >= self.colorDenominator){
                self.colorNumerator = 1; // reset the numerator
                self.colorDenominator *= 2; // double the denominator
                continue;
            }
            hue = self.colorNumerator/self.colorDenominator*360
            self.colorNumerator += 2;
            return hue
        }
        self.colorNumerator = 0
        self.colorDenominator = 2
        return self.generateHue()
    }
    this.newAtoms = []
    this.translations = [[1.0,0,0],[0,1.0,0],[0,0,1.0]].map(function(t){
        return new THREE.Vector3(t[0],t[1],t[2])
    })
    this.newAtoms.push(['A', 0.0, 0.0, 0.0])
    this.newAtoms.push(['G', 0.5, 0.5, 0.0])
    this.newAtoms.push(['C', 0.0, 0.5, 0.5])
    this.newAtoms.push(['De', 0.5, 0.0, 0.5])
    this.newAtoms.push(['Xy', 0.25, 0.25, 0.25])
    this.newAtoms.push(['Z', 0.75, 0.75, 0.25])
    this.newAtoms.push(['W', 0.25, 0.75, 0.75])
    this.newAtoms.push(['H', 0.75, 0.25, 0.75])
    this.buildCrystal = function(){
        self.functionalRepetitions = (self.currentView == 'unit cell' ? self.ucRepetitions : self.sphereRepetitions)
        self.buildSupercell()
        self.buildUnitCell()
        self.addAtoms()
        if(self.currentView == 'unit cell'){
            self.buildEdges()   
        }
        self.calculateEdgeRepeats()
        self.buildBonds()
        self.camera.position.copy(self.superTranslations[2].clone().multiplyScalar(2.0))
        self.camera.setRotationFromQuaternion(new THREE.Quaternion())
        self.camera.lookAt(new THREE.Vector3())
    }
    this.faceNormals = new Array(self.translations.length)
    this.buildSupercell = function(){
        self.cornerRepeatVectors = []
        //var repetitions = (self.currentView == 'unit cell' ? self.ucRepetitions : self.sphereRepetitions)
        self.superTranslations = self.translations.map(function(t,i){
            return t.clone().add(t.clone().multiplyScalar(self.functionalRepetitions[i]))
        })
        self.superCenter = self.superTranslations.reduce(function(v,t,i9){
            return v.add(t)
        }, new THREE.Vector3)
        self.superCenter.multiplyScalar(0.5)
        self.center = new THREE.Vector3()
        self.shift = self.superCenter.clone().negate()
        //console.log(self.shift.toArray()+'')
        self.crystalGroup.position.copy(self.shift)
        for(i3=0; i3<self.translations.length; i3++){ //Atom on a face
            w1 = self.translations[(i3+1)%self.translations.length].clone()
            w2 = self.translations[(i3+2)%self.translations.length].clone()
            this.faceNormals[i3] = w1.clone().cross(w2)
        }
        self.cornerRepeatVectors.push(self.superTranslations[0].clone())
        self.cornerRepeatVectors.push(self.superTranslations[1].clone())
        self.cornerRepeatVectors.push(self.superTranslations[2].clone())
        self.cornerRepeatVectors.push(self.superTranslations[0].clone().add(self.superTranslations[1]))
        self.cornerRepeatVectors.push(self.superTranslations[0].clone().add(self.superTranslations[2]))
        self.cornerRepeatVectors.push(self.superTranslations[1].clone().add(self.superTranslations[2]))
        self.cornerRepeatVectors.push(self.superTranslations[0].clone().add(self.superTranslations[1]).add(self.superTranslations[2]))
    }
    this.buildUnitCell = function(){
        for(i=0; i<self.translations.length; i++){
            self.center.add(self.translations[i])
        }
        self.center.multiplyScalar(0.5)
        var cubeRootVolume = Math.cbrt(self.translations[0].clone().cross(self.translations[1]).dot(self.translations[2]))
        radius = cubeRootVolume/Math.cbrt(self.newAtoms.length)/4
        for(i=0; i<self.newAtoms.length; i++){
            atomData = self.newAtoms[i];
            if(!(atomData[0] in self.elements)){
                self.elements[atomData[0]] = new Element(atomData[0], self.generateHue(), radius)
            }
            var atom = new Atom(atomData[0], new THREE.Vector3(atomData[1], atomData[2], atomData[3]), self.elements[atomData[0]]) //Remove radius to Element
            self.unitCell.add(atom)
        }
        atom1 = self.unitCell.children[0]
        otherAtoms = self.unitCell.children.slice(1)
        self.maxBond = otherAtoms.reduce(function(min, atom2){
            var bondLength = atom2.distanceTo(atom1.position.clone());
            return (bondLength < min ? bondLength : min) ;               
        }, self.center.clone().length()*2)
    }
    this.addAtoms = function(){
        // Repeat the unit cell according to self.ucRepetitions
        var atomRow = self.unitCell.clone().children
        var translations = self.translations.slice()
        translations.push(new THREE.Vector3())
        //var repetitions = (self.currentView == 'unit cell' ? self.ucRepetitions : self.sphereRepetitions)
        translations.forEach(function(t,i){
           atomRow = (i == 0 ? self.unitCell.children.slice() : self.atoms.children.concat(self.hiddenAtoms.children).concat(self.edgeAtoms.children))
           for(j=(i==0 ? 0 : 1); j<=self.functionalRepetitions[i]; j++){
                atomRow.forEach(function(atom){
                    var newAtom = atom.clone().translate(self.translations[i].clone().multiplyScalar(j))
                    //console.log(newAtom.position.toArray())
                    self.addAtom(newAtom)
                })
               
           }
       })
        
    }
    this.addAtom = function(atom){
        position = atom.position.clone().add(self.shift)
        if(self.currentView != 'unit cell'){
            if(self.currentView == 'semisphere' && position.dot(self.semisphereMillers) > 0 || position.length() > self.sphereRadius){
                self.hiddenAtoms.add(atom)
                return
           }
        }
        if(atom.isRepeat){
            self.edgeAtoms.add(atom)
            return
        }
        self.atoms.add(atom)
    }
    this.buildEdges = function(){
        // Add cylinders at the edges
        for(i=0; i<self.superTranslations.length; i++){
            //console.log(154)
            var t0 = self.superTranslations[i]
            var len0 = t0.length()
            lenIndex = len0.toFixed(3)
            if(!self.cellFrameGeometries[lenIndex]){
                self.cellFrameGeometries[lenIndex] = new THREE.CylinderGeometry(self.cellFrameRadius, self.cellFrameRadius, len0, self.cellFrameSegments)
                self.cellFrameSphereGeometries[lenIndex] = new THREE.SphereGeometry(self.cellFrameRadius, 26, 26);
            }
            //var rod = self.connectPoints(pt1, pt2, self.cellFrameRadius = 0.02, self.cellFrameGeometries[lenIndex], self.cellFrameSphereGeometries[lenIndex], self.cellFrameMaterial)
            /*
            var angle = rod.axis.angleTo(t0)
            if(Math.abs(angle) > 0.0001){
                var w = rod.axis.clone().cross(t0)
                w.normalize()
                var q = self.axisAngleQuaternion(w,angle)
            }
            else{
                var q = new THREE.Quaternion()
            }
            */
            var otherTranslations = []
            for(j=0; j<self.superTranslations.length; j++){
                if(i != j){
                    otherTranslations.push(self.superTranslations[j].clone())
                }
            }
            otherTranslations.push(new THREE.Vector3(0,0,0))
            otherTranslations.push(otherTranslations[0].clone().add(otherTranslations[1]))
            for(k=0; k<otherTranslations.length; k++){
                var t1 = otherTranslations[k].clone()
                var rod = self.connectPoints(self.zeroVector.clone().add(t1), t0.clone().add(t1), self.cellFrameRadius, self.cellFrameGeometries[lenIndex], self.cellFrameSphereGeometries[lenIndex], self.cellFrameMaterial)
                //t1.multiplyScalar(self.a);
                //var cyl = rod.clone()
                //cyl.setRotationFromQuaternion(q.clone())
                //cyl.position.add(t0.clone().normalize().multiplyScalar(len0/2))
                //cyl.position.add(t1)//.add(self.shift.clone())
                self.edges.add(rod)
            }           
        }
    }
    this.calculateEdgeRepeats = function(){
        // Repeat atoms that are on the edges
        repeatedAtoms = []
        
        self.atoms.children.concat(self.hiddenAtoms.children).forEach(function(atom){
            if(atom.position.length() < 0.001){ //Atom at origin. Needs to be repeated 7 times
                self.cornerRepeatVectors.forEach(function(repeat, i){
                    //console.log('i')
                    var newAtom = atom.clone()
                    newAtom.isRepeat = true
                    newAtom.position.add(repeat)
                    self.addAtom(newAtom)
                    repeatedAtoms.push(newAtom)
                })
                return
            }
            for(i2=0; i2<self.superTranslations.length; i2++){
                if(self.superTranslations[i2].angleTo(atom.position) < 0.001){ // Atom on an edge
                    var otherTrans = self.superTranslations.slice()
                    popped = otherTrans[i2].clone()
                    otherTrans.push(otherTrans[(i2+1)%otherTrans.length].clone().add(otherTrans[(i2+2)%otherTrans.length]))
                    otherTrans.forEach(function(t, j2){
                        if(j2 != i2){
                            newAtom = atom.clone()
                            newAtom.position.add(t)
                            newAtom.isRepeat = true
                            self.addAtom(newAtom)
                        }
                    })
                    return;
                }
            }
            for(i3=0; i3<self.translations.length; i3++){ //Atom on a face
                proj = atom.position.clone().projectOnVector(self.faceNormals[i3])
                if(Math.abs(proj.length()) < 0.001){ // Atom is in a bounding plane
                    newAtom = atom.clone()
                    newAtom.isRepeat = true
                    t = self.superTranslations[i3].clone()
                    newAtom.translate(t)
                    self.addAtom(newAtom)
                }
            }
        });
    }
    this.buildBonds = function(){
        // Make bonds for atoms with a distance factor of 1.1 the distance to the nearest atom
        var allAtoms = self.atoms.children.concat(self.edgeAtoms.children)
        for(i=0; i< allAtoms.length-1; i++){
            var atom1 = allAtoms[i];
            var unvisitedAtoms = allAtoms.slice(i+1)
            unvisitedAtoms.forEach(function(atom2, j){
                if(Math.abs(atom1.position.x-atom2.position.x) > self.maxBond || Math.abs(atom1.position.y-atom2.position.y) > self.maxBond || Math.abs(atom1.position.z-atom2.position.z) > self.maxBond){
                    return;
                }
                var bondLength = atom1.position.distanceTo(atom2.position)
                if(bondLength < self.maxBond*1.01){
                    var geoIndex = bondLength.toFixed(3)
                    if(!self.bondGeometries[geoIndex]){
                        self.bondGeometries[geoIndex] = new THREE.CylinderGeometry(self.bondRadius, self.bondRadius, bondLength, self.bondSegments)
                        self.bondSphereGeometries[geoIndex] = new THREE.SphereGeometry(self.bondRadius, 26, 26);
                    }
                    
                    var cylinder = self.connectPoints(atom1.position, atom2.position, self.bondRadius, self.bondGeometries[geoIndex], self.bondSphereGeometries[geoIndex], self.bondMaterial)
                    if(atom1.isRepeat || atom2.isRepeat){
                        self.edgeBonds.add(cylinder)
                        return
                    }
                    self.bonds.add(cylinder)
                }
            })
        }
    }
    this.makeTextNodes = function(){
        Object.keys(self.elements).forEach(function(symbol){
            self.elements[symbol].textNode = self.makeText(symbol, new THREE.Vector3())
            self.elements[symbol].textNode.visible = false
            self.textNodes.add(self.elements[symbol].textNode)
        })
    }
    this.connectPoints = function(pt1, pt2, radius, geometry, sphereGeometry, material){
        // Create a cylinder that goes from pt1 to pt2 type: THREE.Vector3
        var v = pt2.clone().add(pt1.clone().negate())
        var len = v.length()
        var rod = new Rod(len, radius, geometry, sphereGeometry, material)
        var angle = rod.axis.angleTo(v)
        if(Math.abs(angle) > 0.0001){
            var w = rod.axis.clone().cross(v)
            w.normalize()
            var q = self.axisAngleQuaternion(w,angle)
        }
        else{
            var q = new THREE.Quaternion()
        }
        rod.setRotationFromQuaternion(q)
        rod.position.add(v.clone().normalize().multiplyScalar(len/2))
        rod.position.add(pt1.clone())
        return rod;
    }
    this.normalize = function(v){
        var invLen = 1.0/Math.sqrt(v.reduce(function(sum,element){ return sum + element*element}, 0))
        w = v.map(function(val,i){
            return invLen*val
        })
        return w
    }
    this.cam = {}
    this.cam.yaw = function(theta){
        var up = new THREE.Vector3(); // create once and reuse it
        up.copy( self.camera.up ).applyQuaternion( self.camera.quaternion );
        self.camera.applyQuaternion(self.axisAngleQuaternion(up, theta))
    }
    this.cam.pitch = function(theta){
        var up = new THREE.Vector3(); // create once and reuse it
        up.copy( self.camera.up ).applyQuaternion( self.camera.quaternion );
        var right = self.camera.getWorldDirection().cross(up)
        self.camera.applyQuaternion(self.axisAngleQuaternion(right, theta))
    }
    this.cam.verticalTranslate = function(y){
        var up = new THREE.Vector3(); // create once and reuse it
        up.copy( self.camera.up ).applyQuaternion( self.camera.quaternion );
        self.camera.translateOnAxis(up,y)
    }
    this.cam.horizontalTranslate = function(x){
        var up = new THREE.Vector3(); // create once and reuse it
        up.copy( self.camera.up ).applyQuaternion( self.camera.quaternion );
        var right = self.camera.getWorldDirection().cross(up)
        self.camera.translateOnAxis(right,x)
    }
    this.cam.forwardTranslate = function(z){
        self.camera.translateOnAxis(self.camera.getWorldDirection(),z)
    }
    this.cam.roll = function(phi){
        self.camera.applyQuaternion(self.axisAngleQuaternion(self.camera.getWorldDirection(), phi))
    }
    this.cntrl.yawAlpha = 0
    this.cntrl.yawVelocity = 0
    this.cntrl.rollAlpha = 0
    this.cntrl.rollVelocity = 0
    this.cntrl.pitchAlpha = 0
    this.cntrl.pitchVelocity = 0
    this.cntrl.horizontalAcc = 0
    this.cntrl.xVelocity = 0
    this.cntrl.verticalAcc = 0
    this.cntrl.yVelocity = 0
    this.cntrl.forwardAcc = 0
    this.cntrl.zVelocity = 0
    this.cntrl.uphatStep = 0
    this.cntrl.righthatStep = 0
    this.moveCamera = function(){
        self.cntrl.forwardAcc = (self.bttns[7] - self.bttns[6] + self.keys[83] + self.keys[32])*self.accMax
        self.cntrl.rollAlpha = (self.bttns[5] - self.bttns[4] + self.keys[81] + self.keys[69])*self.rollAlphaMax
        self.cntrl.horizontalAcc = (self.bttns[15] - self.bttns[14] + self.keys[68] + self.keys[65])*self.accMax
        self.cntrl.verticalAcc = (self.bttns[12] - self.bttns[13] + self.keys[87] + self.keys[88])*self.accMax
        self.cntrl.yawAlpha = (-self.axes[0] + self.keys[37] + self.keys[39])*self.alphaMax
        self.cntrl.pitchAlpha = (-self.axes[1] + self.keys[38] + self.keys[40])*self.alphaMax
        self.cntrl.uphatStep = (self.keys[238] + self.keys[240] - self.axes[3])
        self.cntrl.righthatStep = (self.keys[237] + self.keys[239] - self.axes[2])
        var up = new THREE.Vector3(); // create once and reuse it
        up.copy( self.camera.up ).applyQuaternion( self.camera.quaternion );
        var forward = self.camera.getWorldDirection()
        var right = self.camera.getWorldDirection().cross(up)
        if(self.shiftPressed || self.axes[2] || self.axes[3]){
            var camPos = self.camera.position
            var posLen = camPos.length()
            var orbitUp = camPos.clone().cross(right).normalize().negate()
            var orbitRight = camPos.clone().cross(orbitUp).normalize().negate()
            var orbitUpAngle = self.cntrl.uphatStep*self.orbitSpeed
            var posQuaternion = self.axisAngleQuaternion(orbitRight, orbitUpAngle)
            var newPos = camPos.clone().applyQuaternion(posQuaternion)
            self.camera.position.copy(newPos)
            self.camera.applyQuaternion(posQuaternion, orbitUpAngle)
            var orbitRightAngle = self.cntrl.righthatStep*self.orbitSpeed
            posQuaternion = self.axisAngleQuaternion(orbitUp, orbitRightAngle)
            newPos = camPos.clone().applyQuaternion(posQuaternion)
            self.camera.position.copy(newPos)
            self.camera.applyQuaternion(posQuaternion)
            self.cntrl.forwardAcc = 0
            self.cntrl.rollAlpha = 0
            self.cntrl.horizontalAcc = 0
            self.cntrl.verticalAcc = 0
            self.cntrl.yawAlpha = 0
            self.cntrl.pitchAlpha = 0
        }
        else{
            var totalAcc = right.clone().multiplyScalar(self.cntrl.horizontalAcc)
            totalAcc.add(forward.multiplyScalar(self.cntrl.forwardAcc))
            totalAcc.add(up.multiplyScalar(self.cntrl.verticalAcc))
            timeStep = 1
            yawSign = (self.cntrl.yawVelocity < 0 ? -1 : 1)
            self.cntrl.yawVelocity += self.cntrl.yawAlpha*timeStep - self.cntrl.yawVelocity*self.muddiness*timeStep - yawSign*self.cntrl.yawVelocity*self.cntrl.yawVelocity*self.muddiness*timeStep
            self.cam.yaw(self.cntrl.yawVelocity*timeStep)
            rollSign = (self.cntrl.rollVelocity < 0 ? -1 : 1)
            self.cntrl.rollVelocity += self.cntrl.rollAlpha*timeStep - self.cntrl.rollVelocity*self.muddiness*timeStep - rollSign*self.cntrl.rollVelocity*self.cntrl.rollVelocity*self.muddiness*timeStep
            self.cam.roll(self.cntrl.rollVelocity*timeStep)
            pitchSign = (self.cntrl.pitchVelocity < 0 ? -1 : 1)
            self.cntrl.pitchVelocity += self.cntrl.pitchAlpha*timeStep - self.cntrl.pitchVelocity*self.muddiness*timeStep - pitchSign*self.cntrl.pitchVelocity*self.cntrl.pitchVelocity*self.muddiness*timeStep
            self.cam.pitch(self.cntrl.pitchVelocity*timeStep)
            xSign = (self.cntrl.xVelocity < 0 ? -1 : 1)
            self.cntrl.xVelocity += totalAcc.x*timeStep - self.cntrl.xVelocity*self.muddiness*timeStep - xSign*self.cntrl.xVelocity*self.cntrl.xVelocity*self.muddiness*timeStep
            self.camera.position.x += self.cntrl.xVelocity*timeStep
            ySign = (self.cntrl.yVelocity < 0 ? -1 : 1)
            self.cntrl.yVelocity += totalAcc.y*timeStep - self.cntrl.yVelocity*self.muddiness*timeStep- ySign*self.cntrl.yVelocity*self.cntrl.yVelocity*self.muddiness*timeStep
            self.camera.position.y += self.cntrl.yVelocity*timeStep
            zSign = (self.cntrl.zVelocity < 0 ? -1 : 1)
            self.cntrl.zVelocity += totalAcc.z*timeStep - self.cntrl.zVelocity*self.muddiness *timeStep- zSign*self.cntrl.zVelocity*self.cntrl.zVelocity*self.muddiness*timeStep
            self.camera.position.z += self.cntrl.zVelocity*timeStep
            self.cntrl.uphatStep = 0
            self.cntrl.righthatStep = 0
        }
        var moved = self.camera.matrix.toArray().reduce(function(change, element, i){
            return change + Math.abs(element-self.lastIntersectionCheck[i])
        }, 0)
        if(self.font && moved > 0.01){
            if(self.ui.targetDiv.enabled){
                self.ui.targetDiv.show()
            }
            self.checkIntersection()
        }
        else{
            self.ui.targetDiv.fadeOut()
        }
        if(self.activeAtom && self.elements[self.activeAtom.symbol].textNode){
            self.positionTextToAtom(self.activeAtom)
        }
        self.vectorTextNodes.children.forEach(function(node){
            if(node.isActive){
                node.quaternion.copy(self.camera.getWorldQuaternion())
                //node.lookAt(self.camera.getWorldPosition())
            }
        })
    }
    this.checkIntersection = function(){
        self.lastIntersectionCheck = self.camera.matrix.toArray()
        self.rayCaster.setFromCamera(self.screenCenter, self.perspectiveCamera)
        var atoms = self.rayCaster.intersectObjects(self.atoms.children)
        if(atoms.length){
            window.setTimeout(function(){ self.activateAtom(atoms[0].object)}, 0)
        }
    }
    this.activateAtom = function(atom){
        textNode = self.elements[atom.symbol].textNode
        if(textNode){
            if(self.activeAtom){
                self.elements[self.activeAtom.symbol].textNode.visible = false
                self.elements[self.activeAtom.symbol].textNode.isActive = false
            }
            self.activeAtom = atom
            self.elements[atom.symbol].textNode.visible = true
            self.elements[atom.symbol].textNode.isActive = true
            self.positionTextToAtom(textNode)
        }
    }
    this.positionTextToAtom = function(atom){
        if(!(atom.symbol in self.elements)){return;}
        var toward = self.camera.position.clone().add(atom.getWorldPosition().negate()).normalize()
        var up = new THREE.Vector3(); // create once and reuse it
        up.copy( self.camera.up ).applyQuaternion( self.camera.quaternion );
        var right = self.camera.getWorldDirection().cross(up)
        var textPosition = atom.getWorldPosition().add(toward.multiplyScalar(2.0*atom.radius)) //.add(self.elements[atom.symbol].textNode.centerShifter.clone().applyQuaternion(self.camera.getWorldQuaternion())) //.add(right.clone().multiplyScalar(-1*textWidth/2)).add(up.clone().negate().multiplyScalar(textHeight/2))
        self.elements[atom.symbol].textNode.position.copy(textPosition)
        self.elements[atom.symbol].textNode.setRotationFromQuaternion(self.camera.getWorldQuaternion())
        //atom.textNode.lookAt(atom.getWorldPosition().add(self.camera.getWorldPosition()))
    }
    this.axisAngleQuaternion = function(axis, theta){
        // Attempt to rotate tracer about fixed axis by angle theta using quaternions. See http://paulbourke.net/geometry/rotate/
        axis.normalize()
        var q = new THREE.Quaternion()
        return q.setFromAxisAngle(axis, theta)
    }
    this.bindControls = function(){
        self.jqDoc.mousewheel(function(turn, delta) {
            if (delta == 1){ //scrolled down
                self.camera.position.add(self.camera.getWorldDirection().multiplyScalar(0.1))
            }
            else{
                self.camera.position.add(self.camera.getWorldDirection().multiplyScalar(-0.1))
            }
            return;
        });
        self.jqDoc.keydown(function(e){
            if(e.which == 16){
                self.shiftPressed = true
            }
            switch(e.which) {
                case 37: // left -> yaw left
                if(self.shiftPressed){
                    self.keys[237] = 1
                }
                else{
                    self.keys[37] = 1
                }
                break;

                case 38: // up -> pitch up
                if(self.shiftPressed){
                    self.keys[238] = 1
                }
                else{
                    self.keys[38] = 1
                }
                break;

                case 39: // right ->  yaw right
                if(self.shiftPressed){
                    self.keys[239] = -1
                }
                else{
                    self.keys[39] = -1
                }
                break;

                case 40: // down -> pitch down
                if(self.shiftPressed){
                    self.keys[240] = -1
                }
                else{
                    self.keys[40] = -1
                }
                break;
                
                case 87: // w -> translate up
                self.keys[87] = 1
                break;
                    
                case 83: // s -> translate down
                self.keys[83] = 1
                break;
                    
                case 68: // d -> translte right
                self.keys[68] = 1
                break;
                    
                case 65: // a -> translate left
                self.keys[65] = -1
                break;
                    
                case 32: // spacebar -> forward
                self.keys[32] = -1
                break;
                    
                case 88: // x -> backward
                self.keys[88] = -1
                break;
                    
                case 81: // e -> roll right
                self.keys[81] = -1
                break;

                case 69: // q -> roll left
                self.keys[69] = 1
                break;

                default: return; // exit this handler for other keys
            }
        })
        self.jqDoc.keyup(function(e){
            //console.log(e.which)
            switch(e.which) {
                case 37: //left
                self.keys[37] = 0
                self.keys[237] = 0
                break;

                case 38: // up
                self.keys[38] = 0
                self.keys[238] = 0
                break;

                case 39: // right
                self.keys[39] = 0
                self.keys[239] = 0
                break;

                case 40: // down
                self.keys[40] = 0
                self.keys[240] = 0
                break;
                
                case 87: // w -> up
                self.keys[87] = 0
                //self.cam.verticalTranslate(self.speed)
                break;
                    
                case 83: // s -> down
                self.keys[83] = 0
                //self.cam.verticalTranslate(-self.speed)
                break;
                    
                case 68: // d -> right
                self.keys[68] = 0
                //self.cam.horizontalTranslate(self.speed)
                break;
                    
                case 65: // a -> left
                self.keys[65] = 0
                //self.cam.horizontalTranslate(-self.speed)
                break;
                    
                case 32: // spacebar -> forward
                self.keys[32] = 0
                //self.cam.forwardTranslate(self.speed)
                break;
                    
                case 88: // x -> backward
                self.keys[88] = 0
                //self.cam.forwardTranslate(-self.speed)
                break;
                    
                case 81: // x -> backward
                self.keys[81] = 0
                //self.cam.roll(-self.speed)
                break;

                case 69: // x -> backward
                self.keys[69] = 0
                //self.cam.roll(self.speed)
                break;
                    
                case 13: // enter -> switch to 3d
                console.log('remember to remove this next line')
                //self.go3d();
                break;

                case 16: // shift -> set set.shiftPressed
                self.shiftPressed = false
                break;

                default: return; // exit this handler for other keys
            }
        })
    }
    this.bindUi = function(){
        $('<link/>', {
            rel: 'stylesheet',
            type: 'text/css',
            href: 'https://fonts.googleapis.com/icon?family=Roboto%7CMaterial+Icons'
        }).appendTo('head');
        $('<link/>', {
            rel: 'stylesheet',
            type: 'text/css',
            href: self.localFilepath('crystal.css')
        }).appendTo('head');
        var loader = $(document.createElement('div'))
        loader.load(self.localFilepath('crystal.html'), function(){
            self.frame.append(loader.html())
            self.ui.targetDiv = $("#_crystalTargetDiv")
            self.ui.targetDiv.enabled = true
            self.ui.tooltip = $("#_crystalTooltip")
            self.ui.checkMark = '&#xE876;'
            self.ui.div = $("#_crystalUiDiv")
            self.ui.div.css({'left':-self.ui.div.width()})
            self.ui.targetDiv.css({
                'left' : self.frame.width()/2 - self.ui.targetDiv.width()/2,
                'top' : self.frame.height()/2 - self.ui.targetDiv.height()/2
            })
            // Set up the waiting animations
            self.ui.waitingDivClass = '_crystalLoading'
            self.ui.waitingDiv = $('.'+self.ui.waitingDivClass).clone()
            self.ui.cntrlBlocker = $("#_crystalCntrlBlocker")
            self.ui.waiting = function(element){
                self.ui.cntrlBlocker.css({'left':0})
                var height = element.height()
                var fontSize = (height < 100 ? height : 100)
                element.append(self.ui.waitingDiv.clone().css({'display' : 'inline-block', 'font-size' : fontSize}))
            }
            self.ui.notWaiting = function(element){
                element.children('.'+self.ui.waitingDivClass).remove()
                self.ui.cntrlBlocker.css({'left':'-10000px'})
            }
            self.ui.queueFunction = function(func){
                self.ui.waiting(self.frame)
                setTimeout(function(){
                    func()
                    self.ui.notWaiting(self.frame)
                },75)
            }
            self.ui.bindTooltips = function(jqObj){
                jqObj.find('*').each(function(i,el){
                    jqEl = $(el)
                    var tip = jqEl.data('tooltip')
                    if(tip){
                        jqEl.hover(function(){
                            var box = $(this)
                            var tip = box.data('tooltip')
                            self.ui.tooltip.html(tip)
                            elPos = box.offset()
                            var top = elPos.top - self.ui.tooltip.outerHeight()
                            top = (top > 0 ? top : top + self.ui.tooltip.outerHeight() + box.outerHeight())
                            self.ui.tooltip.css({
                                'top':top,
                                'left':elPos.left
                            })
                        }, function(){
                            self.ui.tooltip.css({'left':'-10000px'})
                        })
                    }
                })
            }
            // Bind view selection buttons
            self.ui.tab = $("#_crystalUiTab")
            self.ui.tab.click(function(){
                var oldState = parseInt(self.ui.tab.data('state'))
                var newState = (oldState ? 0 : 1)
                if(newState){
                    self.ui.div.animate({'left':0},200)
                }
                else{
                    self.ui.div.animate({'left':-self.ui.div.width()},200)
                }
                self.ui.tab.data('state',newState)
            })
            self.ui.changeView = function(view){
                if(self.currentView == view){
                    return;
                }
                self.currentView = view
                self.ui.queueFunction(function(){
                    self.resetCrystal()
                })
            }
            self.ui.unitCellBttn = $('#_crystalUnitCellBttn')
            self.ui.sphereBttn = $('#_crystalSphereBttn')
            self.ui.semisphereBttn = $('#_crystalSemisphereBttn')
            self.ui.unitCellCntrls = $('#_crystalUnitCellCntrls')
            self.ui.perspectiveCamBttn = $("#_crystalPerspectiveCam")
            self.ui.perspectiveCamBttn.click(function(){
                if(self.currentCameraType == 'perspective'){
                    return
                }
                if(self.currentCameraType == '3d'){
                    self.go2d()
                }
                self.currentCameraType = 'perspective'
                self.currentCamera = self.perspectiveCamera
                
            })
            self.ui.orthoCamBttn = $("#_crystalOrthoCam")
            self.ui.orthoCamBttn.click(function(){
                if(self.currentCameraType == 'ortho'){
                    return
                }
                if(self.currentCameraType == '3d'){
                    self.go2d()
                }
                self.currentCameraType = 'ortho'
                self.currentCamera = self.orthoCamera
            })
            self.ui.threedCamBttn = $("#_crystal3dCam")
            self.ui.threedCamBttn.click(function(){
                if(self.currentCameraType == '3d'){
                    return
                }
                self.go3d()
                self.currentCameraType = '3d'
            })
            self.ui.bindTooltips(self.frame)
            self.ui.collapsers = $("._crystal-collapser")
            self.ui.collapsers.click(function(){
                var bttn = $(this)
                var label = bttn.siblings("._crystal-cntrl-label")
                var box = bttn.closest("._crystal-cntrl-row")
                var oldState = parseInt(bttn.data('state'))
                var newState = (oldState ? 0 : 1)
                console.log(oldState+' '+newState)
                if(newState){
                    box.css({'height':'auto'})
                }
                else{
                    box.css({'height':label.height()})
                }
                bttn.data('state', newState)
                bttn.html((newState ? '&#xE8D9;' : '&#xE8D8;'))
            })
            self.ui.sphereCntrls = $('#_crystalSphereCntrls')
            self.ui.semisphereCntrls = $('#_crystalSemisphereCntrls')
            self.ui.vectorBox = $("#_crystalVectorBox")
            self.ui.vectorMaster = $("._crystal-vector-row").clone().css({'display':'block'})
            self.ui.collapseCntrls = function(){
                [self.ui.unitCellCntrls, self.ui.sphereCntrls, self.ui.semisphereCntrls].forEach(function(div){
                    div.css({'height': 0})
                })
            }
            self.ui.unitCellBttn.pseudoClick = function(){
                self.ui.changeView('unit cell')
                self.ui.collapseCntrls()
                self.ui.unitCellCntrls.css({'height':'auto'})
            }
            self.ui.unitCellBttn.click(self.ui.unitCellBttn.pseudoClick)
            self.ui.sphereBttn.pseudoClick = function(){
                self.ui.changeView('sphere')
                self.ui.collapseCntrls()
                self.ui.sphereCntrls.css({'height':'auto'})
            }
            self.ui.sphereBttn.click(self.ui.sphereBttn.pseudoClick)
            self.ui.semisphereBttn.pseudoClick = function(){
                self.ui.changeView('semisphere')
                self.ui.collapseCntrls()
                self.ui.semisphereCntrls.css({'height':'auto'})
            }
            self.ui.semisphereBttn.click(self.ui.semisphereBttn.pseudoClick)
            self.ui.repTimer = false
            self.ui.lastReps = self.functionalRepetitions.slice()
            self.ui.repIncrementers = $("._crystal-incrementer")
            self.ui.repIncrementers.click(function(){
                var incrementer = $(this)
                var display = incrementer.siblings('._crystal-reps-display')
                var tIndex = incrementer.data('translation-index')
                var increment = parseInt(incrementer.data('increment'))
                var reps = self.functionalRepetitions[tIndex]
                if(increment < 0 && reps == 0){
                    return;
                }
                if(increment > 0 && reps >= 4){
                    return;
                }
                var otherIncrementer = incrementer.siblings("._crystal-incrementer")
                var upIncrementer = (increment < 1 ? otherIncrementer : incrementer)
                var downIncrementer = (increment > 1 ? otherIncrementer : incrementer)
                if(self.ui.repTimer){
                    clearTimeout(self.ui.repTimer)
                }
                self.functionalRepetitions[tIndex] += increment
                reps = self.functionalRepetitions[tIndex]
                if(reps < 1){
                    downIncrementer.removeClass('_crystal-incrementer-available')
                }
                if(reps > 1){
                    upIncrementer.removeClass('_crystal-incrementer-available')
                }
                otherIncrementer.addClass('_crystal-incrementer-available')
                display.html(self.functionalRepetitions[tIndex])
                self.ui.repTimer = setTimeout(function(){
                    self.ui.waiting(self.frame)
                    setTimeout(function(){
                        self.resetCrystal()
                        self.ui.notWaiting(self.frame)
                    }, 100)
                }, 1500)
            })            
            self.ui.edgeToggler = $("#_crystalToggleEdges")
            self.ui.bondToggler = $("#_crystalToggleBonds")
            self.ui.edgeToggler.click(function(){
                if(self.ui.edgeToggler.html() != ''){
                    self.ui.edgeToggler.html('')
                    self.edges.visible = false
                }
                else{
                    self.ui.edgeToggler.html(self.ui.checkMark)
                    self.edges.visible = true
                }
            })
            self.ui.bondToggler.click(function(){
                if(self.ui.bondToggler.html() != ''){
                    self.ui.bondToggler.html('')
                    self.bonds.visible = false
                }
                else{
                    self.ui.bondToggler.html(self.ui.checkMark)
                    self.bonds.visible = true
                }
            })
            self.ui.slicerSubmitBttn = $("#_crystalSubmitSlicer")
            self.ui.semisphereIpX = $("#_crystalSemisphereX")
            self.ui.semisphereIpY = $("#_crystalSemisphereY")
            self.ui.semisphereIpZ = $("#_crystalSemisphereZ")
            self.ui.slicerIps = $("._crystal-slicer-component")
            self.ui.slicerPreview = $("#_crystalSlicerPreviewVector")
            self.ui.slicerIpRe = /(-)?([0-9.]+)(\/[0-9.]*)?/
            self.ui.userSlicer = [1,1,1]
            self.ui.parseFraction = function(valString){
                var reMatches = self.ui.slicerIpRe.exec(''+valString)
                if(!reMatches){
                    return false
                }
                var sign = (reMatches[1] == undefined || reMatches[0] == '' ? 1 : -1)
                var flt
                if(!reMatches[2]){
                    return false
                }
                else{
                    flt = parseFloat(reMatches[2])
                    if(isNaN(flt)){
                        return false
                    }
                    flt *= sign
                }
                if(reMatches[3]){
                    var denominator = parseFloat(reMatches[3].replace('/',''))
                    if(isNaN(denominator)){
                        return false
                    }
                    else{
                        flt = flt/denominator
                    }
                    }               
                var signString = (flt < 0 ? '-' : '')
                signedFlt = flt
                flt = Math.abs(flt)
                if(flt%1 < 0.01){
                    flt = parseInt(flt)
                    valString = flt.toFixed()
                }
                else{
                    var fractionFound = false
                    for(i=2; i<7; i++){
                        for(j=1; j < 10; j+=(i%2 == 0 ? 2 : 1)){
                            test = j/i
                            if(Math.abs(flt - test) < 0.01){
                                fractionFound = true
                                valString = j+'/'+i
                            }
                            if(test > flt){
                                break;
                            }
                        }
                        if(fractionFound){
                            break;
                        }
                    }
                    if(!fractionFound){
                        valString = flt.toFixed(2)
                    }
                }
                return [signedFlt, signString+valString]
            }
            self.ui.parseVectorFractions = function(v){
                return v.map(function(x){
                    return self.parseFraction(x)
                })
            }
            self.ui.slicerIps.keyup(function(e){
                //e.stopPropagation()
                var ip = $(this)
                var valString = ip.val().replace(' ','')
                var component = parseInt(ip.data('component'))
                var parsedFrac = self.ui.parseFraction(valString)
                if(!parsedFrac){
                    self.ui.slicerPreview.html("Can't parse")
                }
                else{
                    self.ui.userSlicer[component] = parsedFrac[0]
                    self.ui.slicerPreview.html('( '+self.ui.parseFraction(self.ui.userSlicer[0])[1]+' '+self.ui.parseFraction(self.ui.userSlicer[1])[1]+' '+self.ui.parseFraction(self.ui.userSlicer[2])[1]+')')
                }
            })
            self.ui.slicerSubmitBttn.click(function(e){
                e.stopPropagation()
                var goahead = self.ui.userSlicer.reduce(function(b,c){
                    return b && self.ui.parseFraction(c) != false
                }, true)
                if(!goahead){
                    return false
                }
                var v = new THREE.Vector3()
                self.semisphereMillers = v.fromArray(self.ui.userSlicer)
                self.ui.queueFunction(function(){
                    self.resetCrystal()
                })
            })
            self.ui.vectorIpX = $("#_crystalVectorX")
            self.ui.vectorIpY = $("#_crystalVectorY")
            self.ui.vectorIpZ = $("#_crystalVectorZ")
            self.ui.vectorIps = $("._crystal-vector-component")
            self.ui.vectorPreview = $("#_crystalVectorPreviewVector")
            self.ui.vectorSubmitBttn = $("#_crystalVectorSubmitBttn")
            self.ui.parseVector = function(){
                var v = {}
                v.x = self.ui.parseFraction(self.ui.vectorIpX.val())
                v.y = self.ui.parseFraction(self.ui.vectorIpY.val())
                v.z = self.ui.parseFraction(self.ui.vectorIpZ.val())
                v.v = [v.x[0],v.y[0],v.z[0]]
                v.str = '( '+v.x[1]+' '+v.y[1]+' '+v.z[1]+' )'
                v.isgood = (v.x && v.y && v.z)
                return v
            }
            self.ui.vectorIps.keyup(function(){
                var v = self.ui.parseVector()
                if(!v.isgood){
                    self.ui.vectorPreview.html("Can't parse")
                    return false
                }
                self.ui.vectorPreview.html(v.str)
                return v
            })
            self.ui.cameraSoftUp = function(axis){
                self.camera.lookAt(self.zeroVector)
                var out = self.camera.getWorldDirection()
                var proj = axis.projectOnPlane(out)
                var up = self.cameraUp()
                if(proj.length() < 0.001){
                    return
                }
                else{
                    var angle = up.angleTo(proj)
                }
                if(proj.clone().applyAxisAngle(out, angle).angleTo(up) < 1e-5){
                    self.camera.applyQuaternion(self.axisAngleQuaternion(out, -angle))
                }
                else{
                    self.camera.applyQuaternion(self.axisAngleQuaternion(out, angle))
                }
            }
            self.ui.vectorSubmitBttn.click(function(){
                var v = self.ui.parseVector()
                if(!v.isgood){
                    self.ui.vectorPreview.html("Can't parse")
                    return false
                }
                for(i=0; i<self.arrows.children.length; i++){
                    var a = self.arrows.children[i]
                    if(a.textNode.text == v.str){
                        self.ui.vectorPreview.append(' Vector already added')
                        return
                    }
                }
                var vector = new THREE.Vector3()
                vector.fromArray(v.v)
                if(vector.length() < 0.001){
                    return false;
                }
                var origin = new THREE.Vector3()
                var arrow = self.makeArrow(origin, vector, 0x666666)
                arrow.position.add(self.center)
                self.arrows.add(arrow)
                arrow.textNode = self.makeText(v.str, new THREE.Vector3())
                arrow.textNode.isActive = true
                maxDim = [arrow.textNode.boxLength, arrow.textNode.boxWidth, arrow.textNode.boxDepth].reduce(function(max, size){
                    return (size > max ? size : max)
                }, 0)
                //arrow.textNode.position.add(arrow.ogAxis.clone().setLength(self.len/2+1.2*maxDim))
                self.vectorTextNodes.add(arrow.textNode)
                console.log(maxDim)
                arrow.textNode.position.copy(arrow.tip().add(arrow.axis().setLength(maxDim/2)))
                var vectorRow = self.ui.vectorMaster.clone()
                vectorRow.children('._crystal-vector-display').html(v.str)
                vectorRow.arrow = arrow
                vectorRow.find('._crystal-vector-visibility').click(function(){
                    var bttn = $(this)
                    var oldVisibility = parseInt(bttn.data('visibility'))
                    var newVisibility = (oldVisibility == 1 ? 0 : 1)
                    var boolVisibility = (newVisibility == 1 ? true : false)
                    arrow.visible = newVisibility
                    arrow.textNode.visible = boolVisibility
                    bttn.children('i').html((boolVisibility ? '&#xE876;' : '&nbsp;'))
                    bttn.data('visibility', newVisibility)
                })
                vectorRow.find('._crystal-vector-out').click(function(){
                    self.camera.lookAt(self.zeroVector)
                    var up = self.cameraUp()
                    var axis = arrow.axis()
                    var proj = axis.clone().projectOnPlane(up)
                    var out = self.camera.getWorldPosition().normalize()
                    var angle = out.angleTo(proj)
                    var quat = self.axisAngleQuaternion(up, angle)
                    var invQuat = quat.clone().inverse()
                    if(proj.length() > 0.001){
                        if(axis.clone().applyQuaternion(quat).projectOnPlane(up).angleTo(out) < 0.001){
                            self.camera.position.applyQuaternion(invQuat)
                            self.camera.applyQuaternion(invQuat)
                        }
                        else{
                            self.camera.position.applyQuaternion(quat)
                            self.camera.applyQuaternion(quat)
                        }
                    }
                    var right = self.cameraRight()
                    axis = arrow.axis()
                    out = self.camera.getWorldPosition().normalize()
                    angle = axis.angleTo(out)
                    quat = self.axisAngleQuaternion(right, angle)
                    invQuat = quat.clone().inverse()
                    if(angle > 0.001){
                        if(axis.clone().applyQuaternion(quat).angleTo(out) < 0.001){
                            self.camera.position.applyQuaternion(invQuat)
                            self.camera.applyQuaternion(invQuat)
                        }
                        else{
                            self.camera.position.applyQuaternion(quat)
                            self.camera.applyQuaternion(quat)
                        }
                    }
                })
                vectorRow.find('._crystal-vector-softup').click(function(){
                    self.ui.cameraSoftUp(arrow.axis())
                })
                vectorRow.find('._crystal-vector-hardup').click(function(){
                    self.ui.cameraSoftUp(arrow.axis().clone())
                    var up = self.cameraUp()
                    var right = self.cameraRight()
                    axis = arrow.axis()
                    var angle = axis.angleTo(up)
                    var quat = self.axisAngleQuaternion(right, angle)
                    var invQuat = self.axisAngleQuaternion(right, -angle)
                    if(axis.clone().applyQuaternion(quat).angleTo(up) < 1e-5){
                        self.camera.position.applyQuaternion(invQuat)
                        self.camera.applyQuaternion(invQuat)
                    }
                    else{
                       self.camera.position.applyQuaternion(quat)
                       self.camera.applyQuaternion(quat)
                    }
                })
                vectorRow.find('._crystal-vector-remove').click(function(){
                    self.arrows.remove(arrow)
                    self.vectorTextNodes.remove(arrow.textNode)
                    vectorRow.remove()
                })
                self.ui.vectorBox.append(vectorRow)
                self.ui.bindTooltips(self.ui.vectorBox)
            })
            self.ui.loaded = true
            self.ui.waiting(self.frame)
            setTimeout(function(){
                self.finishInit()
            }, 150)
        })
    }
    this.getGamepads = function(){
        if(!self.smartGamepad){
            setInterval(self.scanGamepads, 500);
            return;
        }
        self.jqWindow.on("gamepadconnected", self.gamepadConnected);
        self.jqWindow.on("gamepaddisconnected", self.gamepadDisconnected);
    }
    this.gamepadConnected = function(e){
        console.log('gampad '+e.gamepad+' removed')
        self.addGamepad(e.gamepad);
    }
    this.gamepadDisconnected = function(e) {
        self.removeGamepad(e.gamepad);
    }
    this.addGamepad = function(gamepad){
        //console.log('gamepad '+gamepad.index+' added')
        self.controllers[gamepad.index] = gamepad;
        requestAnimationFrame(self.updateGamepadStatus);

    }
    this.removeGamepad = function(gamepad) {
        delete self.controllers[gamepad.index];
    }
    this.updateGamepadStatus = function(){
        if (!self.smartGamepad) {
            self.scanGamepads();
        }
        var i = 0;
        var j;
        for (j in self.controllers) {
            var controller = self.controllers[j];
            for (i = 0; i < controller.buttons.length; i++) {
                var val = controller.buttons[i];
                var pressed = val == 1.0;
                if (typeof(val) == "object") {
                    pressed = val.pressed;
                    val = val.value;
                }
                //if(pressed){
                //    console.log('button '+i+' pressed. val: '+val)
                //}
                self.bttns[i] = val
            }
            for (i = 0; i < controller.axes.length; i++) {
                self.axes[i] = controller.axes[i]*controller.axes[i] > 0.0025 ? controller.axes[i] : 0;
                if(self.axes[i] > 0.1){
                    console.log('axis '+i+' detected. val: '+self.axes[i])
                }
            }
        }
        requestAnimationFrame(self.updateGamepadStatus);
    }
    this.scanGamepads = function() {
        var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
        //console.log(gamepads.length+' gamepads detected')
        for (var i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                if (gamepads[i].index in self.controllers) {
                    self.controllers[gamepads[i].index] = gamepads[i];
                } 
                else {
                    self.addGamepad(gamepads[i]);
                }
            }
        }
    }
    this.animate2d = function(time){
        //console.log()
        self.lastFrameTime = time
        self.moveCamera()
        self.renderer.render(self.scene, self.currentCamera);
        self.animationFrameId = requestAnimationFrame(self.animate2d);
    }
    this.animate3d = function(time){
        self.lastFrameTime = time
        self.moveCamera()
        self.stereoCamera.update(self.perspectiveCamera)
        self.renderer.render(self.scene, self.leftCamera);
        self.rightRenderer.render(self.scene, self.rightCamera);
        self.animationFrameId = requestAnimationFrame(self.animate3d);
    }
    this.go2d = function(){
        if(self.animationFrameId){
            cancelAnimationFrame(self.animationFrameId)
        }
        if(self.leftFrame){
            self.leftFrame.css({'display':'none'})
        }
        if(self.rightFrame){
            self.rightFrame.css({'display':'none'})
        }
        self.frame.append(self.renderer.domElement)
        var width = self.frame.width()
        var height = self.frame.height()
        self.renderer.setSize(width, height);
        self.perspectiveCamera.aspect = width/height
        self.perspectiveCamera.updateProjectionMatrix()
        self.ui.targetDiv.enabled = true
        self.animate2d()
    }
    this.go3d = function(){
        if(self.animationFrameId){
            cancelAnimationFrame(self.animationFrameId)
        }
        var width = self.frame.width()/2
        var height = self.frame.height()
        //var v = self.camera.getWorldPosition()
        //var q = self.camera.getWorldQuaternion()
        self.stereoCamera.update(self.perspectiveCamera)
        self.leftCamera.aspect = width/height
        self.leftCamera.updateProjectionMatrix()
        self.rightCamera.aspect = width/height
        self.rightCamera.updateProjectionMatrix()
        self.perspectiveCamera.aspect = width/height
        self.perspectiveCamera.updateProjectionMatrix()
        if(!self.leftFrame){
            self.leftFrame = $(document.createElement('div')).css({
                'position':'absolute',
                'left':0,
                'bottom':0,
                'top':0,
                'width':width
            })
            self.frame.append(self.leftFrame)
        }
        if(!self.rightFrame){
            self.rightFrame = $(document.createElement('div')).css({
                'position':'absolute',
                'right':0,
                'bottom':0,
                'top':0,
                'width':width
            })
            self.frame.append(self.rightFrame)
        }
        self.leftFrame.show()
        self.rightFrame.show()
        self.ui.targetDiv.enabled = false
        if(!self.rightRenderer){
            self.rightRenderer = new THREE.WebGLRenderer();
        }
        self.renderer.setSize(width, height);
        self.rightRenderer.setSize(width, height)
        self.leftFrame.append(self.renderer.domElement)
        self.rightFrame.append(self.rightRenderer.domElement)
        //self.jsFrame.requestFullscreen()
        self.animate3d()
    }
    this.localFilepath = function(filename){
        return self.rootDirectory+'/'+filename
    }
}
var scriptEls = document.getElementsByTagName( 'script' );
var thisScriptEl = scriptEls[scriptEls.length - 1];
var scriptPath = thisScriptEl.src;
crystal = new __Crystal();
crystal.rootDirectory = scriptPath.substr(0, scriptPath.lastIndexOf( '/' )+1 );
crystal.init("crystalFrame");
