import * as net from 'node:net'

/**
 * @param {string} str
 * @returns {boolean}
 */
function isIpAddress(str) {
  return Boolean(net.isIP(str))
}

/**
 * @param {string} host
 * @returns {boolean}
 */
export function isValidHost(host) {
  if (isIpAddress(host)) return true

  // At this point, we either have a domain (like `example.com`), an IP address
  // with a port (like `192.0.2.1:1234`), or something invalid.

  // According to [RFC 1034][0], "the total number of octets that represent a
  // domain name [...] is limited to 255." Offer a lot of wiggle room, but avoid
  // performance issues with super long inputs.
  //
  // [0]: https://tools.ietf.org/html/rfc1034
  // [1]: https://stackoverflow.com/a/7477384/804100
  if (host.length > 4096) return false

  /** @type {URL} */ let url
  try {
    url = new URL('https://' + host)
  } catch (_err) {
    // If we can't parse it, it's not valid.
    return false
  }

  // The parsed URL should be exactly as we expect. It's possible to "trick"
  // this by adding empty things to the end of the URL (like `example.com#`), so
  // also check the string.
  const lastChar = host[host.length - 1]
  return (
    lastChar !== '/' &&
    lastChar !== '?' &&
    lastChar !== '#' &&
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    url.pathname === '/' &&
    url.search === '' &&
    !url.hash
  )
}
