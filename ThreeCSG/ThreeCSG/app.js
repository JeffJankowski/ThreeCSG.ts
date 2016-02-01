var VSRenderer = (function () {
    function VSRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('viewport').appendChild(this.renderer.domElement);
        this.scene = new THREE.Scene();
        this.light = new THREE.DirectionalLight(0xffffff);
        this.light.position.set(1, 1, 1).normalize();
        this.scene.add(this.light);
        this.camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.position.set(5, 5, 15);
        this.camera.lookAt(this.scene.position);
        var loader = new THREE.TextureLoader();
        this.texture = loader.load('texture.png');
    }
    // Example #1 - Cube (mesh) subtract Sphere (mesh)
    VSRenderer.prototype.example1 = function () {
        var start_time = (new Date()).getTime();
        var cube_geometry = new THREE.CubeGeometry(3, 3, 3);
        var cube_mesh = new THREE.Mesh(cube_geometry);
        cube_mesh.position.x = -7;
        var cube_bsp = new ThreeCSG.ThreeBSP(cube_mesh);
        var sphere_geometry = new THREE.SphereGeometry(1.8, 32, 32);
        var sphere_mesh = new THREE.Mesh(sphere_geometry);
        sphere_mesh.position.x = -7;
        var sphere_bsp = new ThreeCSG.ThreeBSP(sphere_mesh);
        var subtract_bsp = cube_bsp.subtract(sphere_bsp);
        var result = subtract_bsp.toMesh(new THREE.MeshLambertMaterial({ map: this.texture }));
        result.geometry.computeVertexNormals();
        this.scene.add(result);
        console.log('Example 1: ' + ((new Date()).getTime() - start_time) + 'ms');
    };
    // Example #2 - Sphere (geometry) union Cube (geometry)
    VSRenderer.prototype.example2 = function () {
        var start_time = (new Date()).getTime();
        var sphere_geometry = new THREE.SphereGeometry(2, 16, 16);
        var sphere_bsp = new ThreeCSG.ThreeBSP(sphere_geometry);
        var cube_geometry = new THREE.CubeGeometry(7, .5, 3);
        var cube_bsp = new ThreeCSG.ThreeBSP(cube_geometry);
        var union_bsp = sphere_bsp.union(cube_bsp);
        var result = union_bsp.toMesh(new THREE.MeshLambertMaterial({ map: this.texture }));
        result.geometry.computeVertexNormals();
        this.scene.add(result);
        console.log('Example 2: ' + ((new Date()).getTime() - start_time) + 'ms');
    };
    // Example #3 - Sphere (geometry) intersect Sphere (mesh)
    VSRenderer.prototype.example3 = function () {
        var start_time = (new Date()).getTime();
        var sphere_geometry_1 = new THREE.SphereGeometry(2, 64, 8);
        var sphere_bsp_1 = new ThreeCSG.ThreeBSP(sphere_geometry_1);
        var sphere_geometry_2 = new THREE.SphereGeometry(2, 8, 32);
        var sphere_mesh_2 = new THREE.Mesh(sphere_geometry_2);
        sphere_mesh_2.position.x = 2;
        var sphere_bsp_2 = new ThreeCSG.ThreeBSP(sphere_mesh_2);
        var intersect_bsp = sphere_bsp_1.intersect(sphere_bsp_2);
        var result = intersect_bsp.toMesh(new THREE.MeshLambertMaterial({ map: this.texture }));
        result.position.x = 6;
        result.geometry.computeVertexNormals();
        this.scene.add(result);
        console.log('Example 3: ' + ((new Date()).getTime() - start_time) + 'ms');
    };
    VSRenderer.prototype.render = function () {
        var _this = this;
        requestAnimationFrame(function () { return _this.render(); });
        this.renderer.render(this.scene, this.camera);
    };
    VSRenderer.prototype.start = function () {
        this.render();
    };
    VSRenderer.prototype.resize = function () {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    return VSRenderer;
})();
var vs;
window.onload = function () {
    vs = new VSRenderer();
    vs.example1();
    vs.example2();
    vs.example3();
    vs.start();
};
window.onresize = function () {
    if (vs)
        vs.resize();
};
//# sourceMappingURL=app.js.map