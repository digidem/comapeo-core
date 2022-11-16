import b4a from 'b4a'

export function getBlockPrefix (block) {
    return b4a.toString(block, 'utf-8', 0, 4)
}
