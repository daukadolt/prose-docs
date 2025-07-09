function Navbar() {
    return (
        <div className="w-full h-10 flex">
            <div className="h-full py-2">
                <img className="max-w-full max-h-full bg-green-100" src="/marker-plain.png" alt="Marker"/>
            </div>
            <div className="h-full ml-auto mr-4">
                <select className="h-full" name="" id="">
                    <option value="Spell check">Spell check</option>
                    <option value="Fact check">Fact check</option>
                </select>
            </div>
        </div>
    );
}

export default Navbar;