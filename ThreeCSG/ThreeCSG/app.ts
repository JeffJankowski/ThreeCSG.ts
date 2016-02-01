
class VSRenderer {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private light: THREE.Light;
    private texture: THREE.Texture;

    constructor() {
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

        let loader = new THREE.TextureLoader();
        this.texture = loader.load('texture.png');
    }

    // Example #1 - Cube (mesh) subtract Sphere (mesh)
    example1() {
        let start_time = (new Date()).getTime();
        let cube_geometry = new THREE.CubeGeometry(3, 3, 3);
        let cube_mesh = new THREE.Mesh(cube_geometry);
        cube_mesh.position.x = -7;
        let cube_bsp = new ThreeCSG.ThreeBSP(cube_mesh);

        let sphere_geometry = new THREE.SphereGeometry(1.8, 32, 32);
        let sphere_mesh = new THREE.Mesh(sphere_geometry);
        sphere_mesh.position.x = -7;
        let sphere_bsp = new ThreeCSG.ThreeBSP(sphere_mesh);

        let subtract_bsp = cube_bsp.subtract(sphere_bsp);
        let result = subtract_bsp.toMesh(new THREE.MeshLambertMaterial({ map: this.texture }));
        result.geometry.computeVertexNormals();
        this.scene.add(result);

        console.log('Example 1: ' + ((new Date()).getTime() - start_time) + 'ms');
    }

    // Example #2 - Sphere (geometry) union Cube (geometry)
    example2() {
        let start_time = (new Date()).getTime();

        let sphere_geometry = new THREE.SphereGeometry(2, 16, 16);
        let sphere_bsp = new ThreeCSG.ThreeBSP(sphere_geometry);

        let cube_geometry = new THREE.CubeGeometry(7, .5, 3);
        let cube_bsp = new ThreeCSG.ThreeBSP(cube_geometry);

        let union_bsp = sphere_bsp.union(cube_bsp);

        let result = union_bsp.toMesh(new THREE.MeshLambertMaterial({ map: this.texture }));
        result.geometry.computeVertexNormals();
        this.scene.add(result);

        console.log('Example 2: ' + ((new Date()).getTime() - start_time) + 'ms');
    }
    
    
    // Example #3 - Sphere (geometry) intersect Sphere (mesh)
    example3() {
        let start_time = (new Date()).getTime();

        let sphere_geometry_1 = new THREE.SphereGeometry(2, 64, 8);
        let sphere_bsp_1 = new ThreeCSG.ThreeBSP(sphere_geometry_1);

        let sphere_geometry_2 = new THREE.SphereGeometry(2, 8, 32);
        let sphere_mesh_2 = new THREE.Mesh(sphere_geometry_2);
        sphere_mesh_2.position.x = 2;
        let sphere_bsp_2 = new ThreeCSG.ThreeBSP(sphere_mesh_2);

        let intersect_bsp = sphere_bsp_1.intersect(sphere_bsp_2);

        let result = intersect_bsp.toMesh(new THREE.MeshLambertMaterial({ map: this.texture }));
        result.position.x = 6;
        result.geometry.computeVertexNormals();
        this.scene.add(result);

        console.log('Example 3: ' + ((new Date()).getTime() - start_time) + 'ms');
    }

    render() {
        requestAnimationFrame(() => this.render());
        this.renderer.render(this.scene, this.camera);
    }

    start() {
        this.render();
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}


let vs: VSRenderer;
window.onload = () => {
    vs = new VSRenderer();
    vs.example1();
    vs.example2();
    vs.example3();
    vs.start();
};

window.onresize = () => {
    if (vs)
        vs.resize();
};