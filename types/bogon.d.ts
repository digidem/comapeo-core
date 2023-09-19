declare module 'bogon' {
  /**
   * Check if an IP is a bogon.
   *
   * @param ip - The IP address to check.
   * @returns `true` if the IP is a bogon, `false` otherwise.
   */
  function bogon(ip: string): boolean

  namespace bogon {
    /**
     * Check if a bogon IP address is a private IP address on a local network.
     *
     * @param ip - The IP address to check.
     * @returns `true` if the IP is a private IP address, `false` otherwise.
     */
    function isPrivate(ip: string): boolean
    const isBogon = bogon
  }

  export = bogon
}
